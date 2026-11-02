import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@eduielts/ielts-client';
import { AppError, conflict, forbidden, notFound } from '../../common/errors';
import { StorageService } from '../../common/storage.service';
import type { Env } from '../../config/env';
import { listeningBand, overallBand, readingBand, speakingBand, writingBand } from '../../ielts-format/band';
import type { SpeakingCriteria, WritingCriteria } from '../../ielts-format/band';
import type { CandidateExam, ExamAnswerKey, StaffReview } from '../../ielts-format/exam.types';
import { markModule } from '../../ielts-format/marking';
import { sniffMime } from '../../ielts-format/media-sniff';
import { IeltsPrisma } from '../../prisma/ielts-prisma.service';
import { AssignmentsService } from '../assignments/assignments.service';
import { EXTENSIONS } from '../tests/asset-fetch';
import { isClassStudent } from '../identity/access.policy';
import { EduportalIdentityReader } from '../identity/eduportal-identity.reader';
import type { EduUser } from '../identity/identity.types';
import { MembershipService } from '../identity/membership.service';
import {
  candidateNumber,
  cleanResponses,
  type DbModule,
  deadlineFor,
  isPastGrace,
  nextModule,
  speakingSlots,
  toModule,
} from './exam-flow';

const RECORDING_MIME = new Set(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav', 'audio/mpeg']);

type AttemptWithTest = Prisma.AttemptGetPayload<{ include: { assignment: { include: { test: true } } } }>;

export interface GradeInput {
  writing?: { task1: WritingCriteria; task2: WritingCriteria; comment?: string };
  speaking?: SpeakingCriteria & { comment?: string };
}

/** A candidate sitting a test, and teachers marking it. */
@Injectable()
export class AttemptsService {
  private readonly log = new Logger(AttemptsService.name);

  constructor(
    private readonly db: IeltsPrisma,
    private readonly members: MembershipService,
    private readonly identity: EduportalIdentityReader,
    private readonly assignments: AssignmentsService,
    private readonly storage: StorageService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // ------------------------------------------------------------- candidate

  /** Starts (or resumes) the student's sitting of an assignment. */
  async start(user: EduUser, assignmentId: string) {
    const a = await this.db.assignment.findUnique({ where: { id: assignmentId }, include: { test: true } });
    if (!a || a.test.archivedAt) throw notFound('Test');
    if (!isClassStudent(await this.members.tree(user.id), a.classId)) throw forbidden('This test is not assigned to you');
    const existing = await this.db.attempt.findUnique({ where: { assignmentId_userId: { assignmentId, userId: user.id } } });
    if (existing) return { id: existing.id };
    const now = new Date();
    if (now < a.opensAt) throw new AppError(HttpStatus.CONFLICT, 'NOT_OPEN_YET', 'This test is not open yet');
    if (now > a.closesAt) throw new AppError(HttpStatus.CONFLICT, 'CLOSED', 'This test is closed');
    const exam = a.test.candidate as unknown as CandidateExam;
    try {
      const attempt = await this.db.attempt.create({
        data: {
          assignmentId,
          userId: user.id,
          currentModule: 'LISTENING',
          moduleStartedAt: now,
          moduleDeadline: deadlineFor(exam, 'LISTENING', now),
          moduleTimes: { listening: { start: now.toISOString() } },
        },
      });
      return { id: attempt.id };
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') {
        const again = await this.db.attempt.findUniqueOrThrow({ where: { assignmentId_userId: { assignmentId, userId: user.id } } });
        return { id: again.id };
      }
      throw e;
    }
  }

  private async loadOwn(user: EduUser, id: string): Promise<AttemptWithTest> {
    const attempt = await this.db.attempt.findUnique({ where: { id }, include: { assignment: { include: { test: true } } } });
    if (!attempt || attempt.userId !== user.id) throw notFound('Attempt');
    return this.expire(attempt);
  }

  /** Auto-submits every module whose time is over (like the real test). */
  private async expire(attempt: AttemptWithTest): Promise<AttemptWithTest> {
    let current = attempt;
    for (let i = 0; i < 4 && current.currentModule && isPastGrace(current.moduleDeadline); i++) {
      await this.advance(current, current.currentModule);
      current = await this.db.attempt.findUniqueOrThrow({ where: { id: attempt.id }, include: { assignment: { include: { test: true } } } });
    }
    return current;
  }

  /**
   * Closes `from` (marking Listening / Reading) and opens the next module.
   * Conditional update, so a double click or two tabs advance only once.
   */
  private async advance(attempt: AttemptWithTest, from: DbModule) {
    const test = attempt.assignment.test;
    const exam = test.candidate as unknown as CandidateExam;
    const key = test.answerKey as unknown as ExamAnswerKey;
    const now = new Date();
    const next = nextModule(from, attempt.assignment.speakingMode);
    // A module auto-submitted late starts the next one from the old deadline,
    // so an abandoned sitting runs out instead of restarting the clock.
    const startNext = attempt.moduleDeadline && attempt.moduleDeadline < now ? attempt.moduleDeadline : now;
    const times = { ...(attempt.moduleTimes as Record<string, Record<string, string>>) };
    times[toModule(from)] = { ...times[toModule(from)], end: startNext.toISOString() };
    if (next) times[toModule(next)] = { start: startNext.toISOString() };

    const data: Prisma.AttemptUpdateManyMutationInput = {
      currentModule: next,
      moduleStartedAt: next ? startNext : null,
      moduleDeadline: next ? deadlineFor(exam, next, startNext) : null,
      moduleTimes: times,
    };
    if (from === 'LISTENING') {
      const m = markModule(key.listening, attempt.listeningAnswers as Record<string, string>);
      Object.assign(data, { listeningRaw: m.raw, listeningBand: listeningBand(m.raw), listeningMarks: m.correct });
    }
    if (from === 'READING') {
      const m = markModule(key.reading, attempt.readingAnswers as Record<string, string>);
      const type = test.testType === 'ACADEMIC' ? 'academic' : 'general_training';
      Object.assign(data, { readingRaw: m.raw, readingBand: readingBand(m.raw, type), readingMarks: m.correct });
    }
    if (!next) Object.assign(data, { status: 'SUBMITTED', submittedAt: now });
    await this.db.attempt.updateMany({ where: { id: attempt.id, currentModule: from }, data });
  }

  /** Everything the exam screen needs for the CURRENT module only. */
  async state(user: EduUser, id: string) {
    const a = await this.loadOwn(user, id);
    const exam = a.assignment.test.candidate as unknown as CandidateExam;
    const m = a.currentModule;
    const recordings = m === 'SPEAKING'
      ? await this.db.speakingRecording.findMany({ where: { attemptId: a.id }, select: { part: true, index: true } })
      : [];
    return {
      attempt: {
        id: a.id,
        status: a.status,
        currentModule: m ? toModule(m) : null,
        moduleStartedAt: a.moduleStartedAt,
        moduleDeadline: a.moduleDeadline,
        serverNow: new Date(),
      },
      candidate: { name: `${user.firstName} ${user.lastName}`, number: candidateNumber(a.id) },
      test: { id: a.assignment.test.id, title: exam.title, testType: exam.testType },
      assignment: {
        id: a.assignmentId,
        title: a.assignment.title,
        resultsReleased: !!a.assignment.resultsReleasedAt,
        speakingMode: a.assignment.speakingMode,
      },
      content:
        m === 'LISTENING'
          ? exam.listening
          : m === 'READING'
            ? exam.reading
            : m === 'WRITING'
              ? exam.writing
              : m === 'SPEAKING'
                ? exam.speaking
                : null,
      saved:
        m === 'LISTENING'
          ? { answers: a.listeningAnswers }
          : m === 'READING'
            ? { answers: a.readingAnswers }
            : m === 'WRITING'
              ? { task1: a.writingTask1, task2: a.writingTask2 }
              : m === 'SPEAKING'
                ? { recordings }
                : null,
    };
  }

  private assertOpen(a: AttemptWithTest, module: DbModule) {
    if (a.currentModule !== module || isPastGrace(a.moduleDeadline))
      throw conflict('MODULE_CLOSED', 'This part of the test is finished');
  }

  /** Autosave of Listening / Reading answers (the full answer sheet each time). */
  async saveAnswers(user: EduUser, id: string, module: 'LISTENING' | 'READING', answers: Record<string, unknown>) {
    const a = await this.loadOwn(user, id);
    this.assertOpen(a, module);
    const clean = cleanResponses(answers);
    await this.db.attempt.updateMany({
      where: { id: a.id, currentModule: module },
      data: module === 'LISTENING' ? { listeningAnswers: clean } : { readingAnswers: clean },
    });
    return { ok: true, savedAt: new Date() };
  }

  async saveWriting(user: EduUser, id: string, texts: { task1: string; task2: string }) {
    const a = await this.loadOwn(user, id);
    this.assertOpen(a, 'WRITING');
    await this.db.attempt.updateMany({
      where: { id: a.id, currentModule: 'WRITING' },
      data: { writingTask1: texts.task1, writingTask2: texts.task2 },
    });
    return { ok: true, savedAt: new Date() };
  }

  /** The candidate submits the current module early. */
  async finishModule(user: EduUser, id: string, module: DbModule) {
    const a = await this.loadOwn(user, id);
    if (a.currentModule === module) await this.advance(a, module);
    return this.state(user, id);
  }

  async saveRecording(user: EduUser, id: string, part: number, index: number, file: Express.Multer.File | undefined, durationMs?: number) {
    const a = await this.loadOwn(user, id);
    this.assertOpen(a, 'SPEAKING');
    if (!file) throw new AppError(HttpStatus.BAD_REQUEST, 'FILE_REQUIRED', 'No recording uploaded');
    const slots = speakingSlots(a.assignment.test.candidate as unknown as CandidateExam);
    if (![1, 2, 3].includes(part) || index < 0 || index >= slots[part as 1 | 2 | 3])
      throw new AppError(HttpStatus.BAD_REQUEST, 'BAD_SLOT', 'No such speaking question');
    if (file.size > this.config.get('MAX_RECORDING_MB', { infer: true }) * 1024 * 1024)
      throw new AppError(HttpStatus.PAYLOAD_TOO_LARGE, 'FILE_TOO_LARGE', 'Recording is too large');
    const mime = sniffMime(file.buffer);
    if (!mime || !RECORDING_MIME.has(mime))
      throw new AppError(HttpStatus.UNSUPPORTED_MEDIA_TYPE, 'UNSUPPORTED_AUDIO', 'Unsupported recording format');
    const fileName = `${part}-${index}-${randomUUID()}.${EXTENSIONS[mime]}`;
    await this.storage.write(['recordings', a.id], fileName, file.buffer);
    await this.db.speakingRecording.upsert({
      where: { attemptId_part_index: { attemptId: a.id, part, index } },
      create: { attemptId: a.id, part, index, fileName, mimeType: mime, sizeBytes: file.size, durationMs: durationMs ?? null },
      update: { fileName, mimeType: mime, sizeBytes: file.size, durationMs: durationMs ?? null, createdAt: new Date() },
    });
    return { ok: true };
  }

  // ------------------------------------------------------------- results

  private async loadForViewer(user: EduUser, id: string) {
    const raw = await this.db.attempt.findUnique({ where: { id }, include: { assignment: { include: { test: true } } } });
    if (!raw) throw notFound('Attempt');
    if (raw.userId === user.id) {
      const a = await this.expire(raw);
      if (!a.assignment.resultsReleasedAt) throw new AppError(HttpStatus.FORBIDDEN, 'RESULTS_NOT_RELEASED', 'Results are not released yet');
      return { a, staff: false };
    }
    await this.assignments.getManaged(user, raw.assignmentId);
    return { a: await this.expire(raw), staff: true };
  }

  /** Test Report Form: bands plus the marked answer sheets. Staff also get transcripts. */
  async result(user: EduUser, id: string) {
    const { a, staff } = await this.loadForViewer(user, id);
    const test = a.assignment.test;
    const review = test.staff as unknown as StaffReview;
    const exam = test.candidate as unknown as CandidateExam;
    const [person] = await this.identity.findUsersByIds([a.userId]);
    const recordings = await this.db.speakingRecording.findMany({
      where: { attemptId: a.id },
      select: { id: true, part: true, index: true, durationMs: true },
      orderBy: [{ part: 'asc' }, { index: 'asc' }],
    });
    const sheet = (answers: unknown, marks: unknown, key: Record<number, string>, why: Record<number, string> = {}) =>
      Array.from({ length: 40 }, (_, i) => i + 1).map((n) => ({
        number: n,
        answer: (answers as Record<string, string>)[n] ?? '',
        correct: marks ? !!(marks as Record<string, boolean>)[n] : null,
        key: key[n],
        ...(why[n] ? { explanation: why[n] } : {}),
      }));
    return {
      staff,
      candidate: {
        id: a.userId,
        name: person ? `${person.firstName} ${person.lastName}` : 'Candidate',
        number: candidateNumber(a.id),
      },
      test: { id: test.id, title: test.title, testType: exam.testType },
      assignment: {
        id: a.assignmentId,
        title: a.assignment.title,
        classTitle: a.assignment.classTitle,
        resultsReleasedAt: a.assignment.resultsReleasedAt,
        speakingMode: a.assignment.speakingMode,
      },
      attempt: {
        id: a.id,
        status: a.status,
        currentModule: a.currentModule ? toModule(a.currentModule) : null,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
        gradedAt: a.gradedAt,
      },
      bands: {
        listening: a.listeningBand,
        reading: a.readingBand,
        writing: a.writingBand,
        speaking: a.speakingBand,
        overall: a.overallBand,
      },
      raw: { listening: a.listeningRaw, reading: a.readingRaw },
      listening: sheet(a.listeningAnswers, a.listeningMarks, review.answers.listening, review.explanations?.listening),
      reading: sheet(a.readingAnswers, a.readingMarks, review.answers.reading, review.explanations?.reading),
      writing: {
        tasks: exam.writing.tasks,
        texts: [a.writingTask1, a.writingTask2],
        scores: a.writingScores,
      },
      speaking: { content: exam.speaking, recordings, scores: a.speakingScores },
      ...(staff ? { transcripts: review.listening, notes: review.notes ?? {} } : {}),
    };
  }

  async sendRecording(user: EduUser, attemptId: string, recordingId: string, res: Response) {
    const rec = await this.db.speakingRecording.findUnique({ where: { id: recordingId } });
    if (!rec || rec.attemptId !== attemptId) throw notFound('Recording');
    await this.loadForViewer(user, attemptId);
    this.storage.send(res, ['recordings', attemptId], rec.fileName, rec.mimeType);
  }

  /** Writing / Speaking marks from a teacher; computes the overall band when complete. */
  async grade(user: EduUser, id: string, input: GradeInput) {
    const a = await this.db.attempt.findUnique({ where: { id } });
    if (!a) throw notFound('Attempt');
    await this.assignments.getManaged(user, a.assignmentId);
    if (a.status === 'IN_PROGRESS' && a.currentModule !== 'SPEAKING')
      throw conflict('NOT_FINISHED', 'The candidate has not finished Writing yet');
    if (input.speaking && a.status === 'IN_PROGRESS')
      throw conflict('NOT_FINISHED', 'The candidate has not finished Speaking yet');

    const data: Prisma.AttemptUpdateInput = { gradedById: user.id, gradedAt: new Date() };
    let wBand = a.writingBand;
    let sBand = a.speakingBand;
    if (input.writing) {
      wBand = writingBand(input.writing.task1, input.writing.task2);
      data.writingScores = input.writing as object;
      data.writingBand = wBand;
    }
    if (input.speaking) {
      sBand = speakingBand(input.speaking);
      data.speakingScores = input.speaking as object;
      data.speakingBand = sBand;
    }
    const complete =
      a.status !== 'IN_PROGRESS' && a.listeningBand !== null && a.readingBand !== null && wBand !== null && sBand !== null;
    if (complete) {
      data.overallBand = overallBand({ listening: a.listeningBand!, reading: a.readingBand!, writing: wBand!, speaking: sBand! });
      data.status = 'GRADED';
    }
    await this.db.attempt.update({ where: { id }, data });
    this.log.log(`Attempt ${id} graded by ${user.id}`);
    return this.result(user, id);
  }
}
