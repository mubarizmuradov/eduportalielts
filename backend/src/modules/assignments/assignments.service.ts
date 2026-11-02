import { HttpStatus, Injectable } from '@nestjs/common';
import { AppError, conflict, forbidden, notFound } from '../../common/errors';
import type { ExamSummary } from '../../ielts-format/exam.types';
import { IeltsPrisma } from '../../prisma/ielts-prisma.service';
import { canAuthorInAcademy, canManageClass, manageableClassScope, studentClassIds } from '../identity/access.policy';
import { EduportalIdentityReader } from '../identity/eduportal-identity.reader';
import type { EduUser } from '../identity/identity.types';
import { MembershipService } from '../identity/membership.service';

export interface CreateAssignment {
  testId: string;
  classId: string;
  title?: string;
  opensAt: Date;
  closesAt: Date;
}

/** Giving a test to an EduPortal class, and the class report. */
@Injectable()
export class AssignmentsService {
  constructor(
    private readonly db: IeltsPrisma,
    private readonly members: MembershipService,
    private readonly identity: EduportalIdentityReader,
  ) {}

  /** Classes the user may assign tests to (owner: academy, manager: campus, teacher/mentor: own classes). */
  async manageableClasses(user: EduUser) {
    const tree = await this.members.tree(user.id);
    const scope = user.isSystemAdmin
      ? { academyIds: tree.academies.map((a) => a.academyId), campusIds: [], classIds: tree.classes.map((c) => c.classId) }
      : manageableClassScope(tree);
    const classes = await this.identity.findClassesInScope(scope);
    return classes.map((c) => ({
      id: c.id,
      title: c.title,
      academyId: c.academyId,
      campusId: c.campusId,
      academyName: c.academy.name,
      campusName: c.campus.name,
    }));
  }

  async create(user: EduUser, input: CreateAssignment) {
    if (input.closesAt <= input.opensAt) throw new AppError(HttpStatus.BAD_REQUEST, 'BAD_WINDOW', 'closesAt must be after opensAt');
    if (input.closesAt <= new Date()) throw new AppError(HttpStatus.BAD_REQUEST, 'BAD_WINDOW', 'closesAt is in the past');
    const test = await this.db.ieltsTest.findUnique({ where: { id: input.testId } });
    if (!test || test.archivedAt) throw notFound('Test');
    const cls = await this.identity.findActiveClass(input.classId);
    if (!cls) throw notFound('Class');
    const tree = await this.members.tree(user.id);
    if (!canManageClass(tree, cls, user.isSystemAdmin)) throw forbidden('You can not assign tests to this class');
    if (cls.academyId !== test.academyId) throw forbidden('The test belongs to another academy');
    return this.db.assignment.create({
      data: {
        testId: test.id,
        academyId: cls.academyId,
        campusId: cls.campusId,
        classId: cls.id,
        classTitle: cls.title,
        createdById: user.id,
        title: input.title?.trim() || test.title,
        opensAt: input.opensAt,
        closesAt: input.closesAt,
      },
    });
  }

  /** Loads an assignment the user may manage. */
  async getManaged(user: EduUser, id: string) {
    const a = await this.db.assignment.findUnique({ where: { id }, include: { test: true } });
    if (!a) throw notFound('Assignment');
    const tree = await this.members.tree(user.id);
    const ok =
      canManageClass(tree, { id: a.classId, academyId: a.academyId, campusId: a.campusId }, user.isSystemAdmin) ||
      (a.createdById === user.id && canAuthorInAcademy(tree, a.academyId));
    if (!ok) throw forbidden();
    return a;
  }

  /** Staff list: assignments of classes the user manages. */
  async listForStaff(user: EduUser) {
    const tree = await this.members.tree(user.id);
    const scope = user.isSystemAdmin ? null : manageableClassScope(tree);
    const rows = await this.db.assignment.findMany({
      where: scope
        ? {
            OR: [
              { academyId: { in: scope.academyIds } },
              { campusId: { in: scope.campusIds } },
              { classId: { in: scope.classIds } },
              { createdById: user.id },
            ],
          }
        : { academyId: { in: tree.academies.map((a) => a.academyId) } },
      include: {
        test: { select: { title: true, testType: true } },
        attempts: { select: { status: true } },
      },
      orderBy: { opensAt: 'desc' },
      take: 300,
    });
    return rows.map(({ attempts, ...a }) => ({
      ...a,
      counts: {
        started: attempts.length,
        submitted: attempts.filter((x) => x.status !== 'IN_PROGRESS').length,
        graded: attempts.filter((x) => x.status === 'GRADED').length,
      },
    }));
  }

  /** Student list: assignments of the student's classes and the student's attempt. */
  async listForStudent(user: EduUser) {
    const classIds = studentClassIds(await this.members.tree(user.id));
    if (classIds.length === 0) return [];
    const rows = await this.db.assignment.findMany({
      where: { classId: { in: classIds }, test: { archivedAt: null } },
      include: {
        test: { select: { title: true, testType: true } },
        attempts: {
          where: { userId: user.id },
          select: {
            id: true,
            status: true,
            currentModule: true,
            listeningBand: true,
            readingBand: true,
            writingBand: true,
            speakingBand: true,
            overallBand: true,
          },
        },
      },
      orderBy: { opensAt: 'desc' },
      take: 200,
    });
    return rows.map(({ attempts, createdById: _c, ...a }) => {
      const attempt = attempts[0] ?? null;
      const released = !!a.resultsReleasedAt;
      return {
        ...a,
        attempt: attempt && {
          id: attempt.id,
          status: attempt.status,
          currentModule: attempt.currentModule,
          ...(released
            ? {
                listeningBand: attempt.listeningBand,
                readingBand: attempt.readingBand,
                writingBand: attempt.writingBand,
                speakingBand: attempt.speakingBand,
                overallBand: attempt.overallBand,
              }
            : {}),
        },
      };
    });
  }

  /** Class report: every student of the class with their attempt. */
  async report(user: EduUser, id: string) {
    const a = await this.getManaged(user, id);
    const [students, attempts] = await Promise.all([
      this.identity.findClassStudents(a.classId),
      this.db.attempt.findMany({
        where: { assignmentId: a.id },
        select: {
          id: true,
          userId: true,
          status: true,
          currentModule: true,
          startedAt: true,
          submittedAt: true,
          listeningRaw: true,
          listeningBand: true,
          readingRaw: true,
          readingBand: true,
          writingBand: true,
          speakingBand: true,
          overallBand: true,
        },
      }),
    ]);
    const studentUsers = students.map((s) => s.user);
    // Students who left the class but already sat the test stay in the report.
    const missing = attempts.filter((x) => !studentUsers.some((u) => u.id === x.userId)).map((x) => x.userId);
    const extra = await this.identity.findUsersByIds(missing);
    const people = [...studentUsers, ...extra];
    return {
      assignment: {
        id: a.id,
        title: a.title,
        classId: a.classId,
        classTitle: a.classTitle,
        opensAt: a.opensAt,
        closesAt: a.closesAt,
        resultsReleasedAt: a.resultsReleasedAt,
        testId: a.testId,
        testTitle: a.test.title,
        testType: a.test.testType,
        summary: a.test.summary as unknown as ExamSummary,
      },
      rows: people
        .map((u) => ({
          user: { id: u.id, firstName: u.firstName, lastName: u.lastName, avatarUrl: u.avatarUrl },
          attempt: attempts.find((x) => x.userId === u.id) ?? null,
        }))
        .sort((x, y) => `${x.user.firstName} ${x.user.lastName}`.localeCompare(`${y.user.firstName} ${y.user.lastName}`)),
    };
  }

  async update(user: EduUser, id: string, patch: { resultsReleased?: boolean; closesAt?: Date }) {
    const a = await this.getManaged(user, id);
    if (patch.closesAt && patch.closesAt <= a.opensAt)
      throw new AppError(HttpStatus.BAD_REQUEST, 'BAD_WINDOW', 'closesAt must be after opensAt');
    return this.db.assignment.update({
      where: { id },
      data: {
        ...(patch.resultsReleased !== undefined
          ? { resultsReleasedAt: patch.resultsReleased ? (a.resultsReleasedAt ?? new Date()) : null }
          : {}),
        ...(patch.closesAt ? { closesAt: patch.closesAt } : {}),
      },
    });
  }

  async remove(user: EduUser, id: string) {
    await this.getManaged(user, id);
    const started = await this.db.attempt.count({ where: { assignmentId: id } });
    if (started > 0) throw conflict('HAS_ATTEMPTS', 'Students have already started this test');
    await this.db.assignment.delete({ where: { id } });
    return { ok: true };
  }
}
