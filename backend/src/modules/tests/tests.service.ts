import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { AppError, forbidden, notFound } from '../../common/errors';
import { StorageService } from '../../common/storage.service';
import type { Env } from '../../config/env';
import { buildIeltsExam } from '../../ielts-format/build-exam';
import { adaptContentV1, isContentV1, PLACEHOLDER_ASSET_HOST } from '../../ielts-format/content-v1';
import type { BuildIssue, BuiltExam, CandidateExam } from '../../ielts-format/exam.types';
import { IeltsPrisma } from '../../prisma/ielts-prisma.service';
import { canAuthorInAcademy, staffAcademyIds } from '../identity/access.policy';
import { EduportalIdentityReader } from '../identity/eduportal-identity.reader';
import type { EduUser } from '../identity/identity.types';
import { MembershipService } from '../identity/membership.service';
import { AssetFetchError, EXTENSIONS, fetchAsset } from './asset-fetch';

const TEST_TYPE = { academic: 'ACADEMIC', general_training: 'GENERAL_TRAINING' } as const;

/** IELTS mock tests: import from an AI package, list, preview, archive, serve media. */
@Injectable()
export class TestsService {
  private readonly log = new Logger(TestsService.name);

  constructor(
    private readonly db: IeltsPrisma,
    private readonly members: MembershipService,
    private readonly identity: EduportalIdentityReader,
    private readonly storage: StorageService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async staffAcademies(user: EduUser) {
    const tree = await this.members.tree(user.id);
    return user.isSystemAdmin ? tree.academies.map((a) => a.academyId) : staffAcademyIds(tree);
  }

  /**
   * Reads either format: IELTS Test Package 1.x (main) or ielts-content 1.0.0
   * (hand-off), which is converted first. Errors of a converted package that
   * only the builder finds point into the converted package ("converted: …").
   */
  private prepare(input: unknown):
    | { ok: true; exam: BuiltExam; warnings: BuildIssue[]; format: string; fixtureOnly: boolean; unresolvedAssets: boolean }
    | { ok: false; errors: BuildIssue[]; warnings: BuildIssue[]; format: string } {
    if (!isContentV1(input)) {
      const r = buildIeltsExam(input);
      return r.ok
        ? { ok: true, exam: r.exam, warnings: r.exam.warnings, format: 'ielts-package', fixtureOnly: false, unresolvedAssets: false }
        : { ok: false, errors: r.errors, warnings: r.warnings, format: 'ielts-package' };
    }
    const format = 'ielts-content 1.0.0';
    const base = this.config.get('ASSET_STORAGE_BASE_URL', { infer: true });
    const a = adaptContentV1(input, { assetBaseUrl: base || undefined });
    if (!a.ok) return { ok: false, errors: a.errors, warnings: a.warnings, format };
    const converted = (xs: BuildIssue[]) => xs.map((x) => ({ ...x, path: `converted: ${x.path}` }));
    const r = buildIeltsExam(a.pkg);
    if (!r.ok) return { ok: false, errors: converted(r.errors), warnings: [...a.warnings, ...converted(r.warnings)], format };
    return {
      ok: true,
      exam: r.exam,
      warnings: [...a.warnings, ...converted(r.exam.warnings)],
      format,
      fixtureOnly: a.fixtureOnly,
      unresolvedAssets: r.exam.assets.some((x) => x.url?.includes(PLACEHOLDER_ASSET_HOST)),
    };
  }

  /** Dry run: what the builder thinks of a package. Nothing is stored. */
  validate(pkg: unknown) {
    const r = this.prepare(pkg);
    return r.ok
      ? {
          ok: true as const,
          errors: [],
          warnings: r.warnings,
          summary: r.exam.summary,
          format: r.format,
          /** Valid, but can not be imported as it is (test data / media not reachable). */
          importable: !r.fixtureOnly && !r.unresolvedAssets,
        }
      : { ok: false as const, errors: r.errors, warnings: r.warnings, format: r.format };
  }

  /** Builds the exam, stores its media and saves it in the academy's test library. */
  async import(user: EduUser, academyId: string, pkg: unknown) {
    const tree = await this.members.tree(user.id);
    if (!canAuthorInAcademy(tree, academyId, user.isSystemAdmin))
      throw forbidden('Only owners, managers, teachers and mentors of this academy can add IELTS tests');
    const result = this.prepare(pkg);
    if (!result.ok)
      throw new AppError(HttpStatus.UNPROCESSABLE_ENTITY, 'INVALID_PACKAGE', 'The package is not a valid IELTS test', {
        errors: result.errors,
        warnings: result.warnings,
      });
    if (result.fixtureOnly)
      throw new AppError(HttpStatus.UNPROCESSABLE_ENTITY, 'FIXTURE_ONLY', 'This package is test data only (fixtureOnly) and can not be given to students');
    if (result.unresolvedAssets)
      throw new AppError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'ASSETS_NOT_RESOLVABLE',
        'The media of this package can not be downloaded: set ASSET_STORAGE_BASE_URL on the server',
      );
    const exam = result.exam;
    const packageSha256 = createHash('sha256').update(JSON.stringify(pkg)).digest('hex');
    // The same package twice in one academy is almost always a double click.
    const same = await this.db.ieltsTest.findFirst({
      where: { academyId, packageSha256, archivedAt: null },
      select: { id: true, title: true },
    });
    if (same)
      throw new AppError(HttpStatus.CONFLICT, 'DUPLICATE_PACKAGE', `This package is already in the library: "${same.title}"`, {
        testId: same.id,
      });
    const testId = randomUUID();
    const allowedHosts = this.config.get('ASSET_FETCH_ALLOWED_HOSTS', { infer: true });

    const stored: Array<{ key: string; fileName: string; data: Buffer }> = [];
    try {
      for (const a of exam.assets) {
        const data = a.data ?? (await fetchAsset(a, allowedHosts));
        const fileName = `${randomUUID()}.${EXTENSIONS[a.mimeType]}`;
        await this.storage.write(['tests', testId], fileName, data);
        stored.push({ key: a.id, fileName, data });
      }
      await this.db.ieltsTest.create({
        data: {
          id: testId,
          academyId,
          createdById: user.id,
          title: exam.candidate.title,
          testType: TEST_TYPE[exam.candidate.testType],
          schemaVersion: exam.schemaVersion,
          candidate: exam.candidate as object,
          answerKey: exam.answerKey as object,
          staff: exam.staff as object,
          summary: exam.summary as object,
          warnings: exam.warnings as object,
          packageSha256,
          assets: {
            create: exam.assets.map((a) => {
              const s = stored.find((x) => x.key === a.id)!;
              return {
                key: a.id,
                kind: a.kind,
                mimeType: a.mimeType,
                fileName: s.fileName,
                sizeBytes: s.data.length,
                sha256: createHash('sha256').update(s.data).digest('hex'),
                durationSeconds: a.durationSeconds ?? null,
                alt: a.alt ?? null,
              };
            }),
          },
        },
      });
    } catch (e) {
      await this.storage.removeDir(['tests', testId]).catch(() => undefined);
      if (e instanceof AssetFetchError)
        throw new AppError(HttpStatus.UNPROCESSABLE_ENTITY, 'ASSET_DOWNLOAD_FAILED', e.message);
      throw e;
    }
    this.log.log(`Imported IELTS test ${testId} "${exam.candidate.title}" into academy ${academyId}`);
    return { id: testId, summary: exam.summary, warnings: result.warnings };
  }

  async list(user: EduUser, academyId?: string) {
    const academies = await this.staffAcademies(user);
    const ids = academyId ? academies.filter((a) => a === academyId) : academies;
    const tests = await this.db.ieltsTest.findMany({
      where: { academyId: { in: ids }, archivedAt: null },
      select: {
        id: true,
        academyId: true,
        title: true,
        testType: true,
        summary: true,
        createdById: true,
        createdAt: true,
        _count: { select: { assignments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    const authors = await this.identity.findUsersByIds([...new Set(tests.map((t) => t.createdById))]);
    return tests.map(({ _count, ...t }) => ({
      ...t,
      assignmentCount: _count.assignments,
      createdBy: authors.find((a) => a.id === t.createdById) ?? null,
    }));
  }

  /** Loads a test the user may manage (staff of its academy). */
  async getForStaff(user: EduUser, id: string) {
    const test = await this.db.ieltsTest.findUnique({
      where: { id },
      include: { assets: { select: { key: true, kind: true, mimeType: true, sizeBytes: true, durationSeconds: true, alt: true } } },
    });
    if (!test) throw notFound('Test');
    const tree = await this.members.tree(user.id);
    if (!canAuthorInAcademy(tree, test.academyId, user.isSystemAdmin)) throw forbidden();
    return test;
  }

  async preview(user: EduUser, id: string) {
    const { answerKey: _key, ...test } = await this.getForStaff(user, id);
    return test;
  }

  async archive(user: EduUser, id: string) {
    await this.getForStaff(user, id);
    await this.db.ieltsTest.update({ where: { id }, data: { archivedAt: new Date() } });
    return { ok: true };
  }

  /**
   * Media of a test. Staff of the academy: always. Candidates: images while
   * they have an attempt; recordings only during the module that plays them
   * (Listening audio during Listening), or after results are released.
   */
  async sendAsset(user: EduUser, testId: string, key: string, res: Response) {
    const asset = await this.db.testAsset.findUnique({ where: { testId_key: { testId, key } } });
    if (!asset) throw notFound('File');
    const test = await this.db.ieltsTest.findUnique({ where: { id: testId }, select: { academyId: true, candidate: true } });
    if (!test) throw notFound('File');
    const tree = await this.members.tree(user.id);
    if (!canAuthorInAcademy(tree, test.academyId, user.isSystemAdmin)) {
      const attempt = await this.db.attempt.findFirst({
        where: { userId: user.id, assignment: { testId } },
        select: { currentModule: true, assignment: { select: { resultsReleasedAt: true } } },
      });
      if (!attempt) throw forbidden();
      const released = !!attempt.assignment.resultsReleasedAt;
      if (asset.kind === 'audio' && !released) {
        const listening = (test.candidate as unknown as CandidateExam).listening.parts.some((p) => p.audio === key);
        const allowedModule = listening ? 'LISTENING' : 'SPEAKING';
        if (attempt.currentModule !== allowedModule) throw forbidden('This recording is not available now');
      }
    }
    this.storage.send(res, ['tests', testId], asset.fileName, asset.mimeType);
  }
}
