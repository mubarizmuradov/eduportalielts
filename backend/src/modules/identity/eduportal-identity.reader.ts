import { Injectable } from '@nestjs/common';
import { EduportalPrisma } from '../../prisma/eduportal-prisma.service';
import type { EduUser, MembershipTree } from './identity.types';

/**
 * The only component that reads EduPortal tables. Every query filters
 * soft-deleted rows (`deleted_at IS NULL`) and ACTIVE status, mirroring
 * EduPortal's own membership rules (backend/role-management-rules.md).
 */
@Injectable()
export class EduportalIdentityReader {
  constructor(private readonly db: EduportalPrisma) {}

  async findActiveUser(userId: string): Promise<EduUser | null> {
    const u = await this.db.epUser.findFirst({
      where: { id: userId, deletedAt: null, isTemp: false },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        language: true,
        role: true,
      },
    });
    if (!u) return null;
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      avatarUrl: u.avatarUrl,
      language: u.language,
      isSystemAdmin: u.role === 'ADMIN',
    };
  }

  /** EduPortal refresh-session row still valid (used for shared JWT login). */
  async isEduportalSessionValid(sessionId: string, userId: string): Promise<boolean> {
    const s = await this.db.epSession.findFirst({
      where: { id: sessionId, userId, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    return !!s;
  }

  async findUsersByIds(ids: string[]) {
    if (ids.length === 0) return [];
    return this.db.epUser.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
    });
  }

  async getMembershipTree(userId: string): Promise<MembershipTree> {
    const [academyRows, campusRows, classRows] = await Promise.all([
      this.db.epAcademyUser.findMany({
        where: { userId, status: 'ACTIVE', deletedAt: null, academy: { deletedAt: null } },
        select: {
          academyRole: true,
          academy: { select: { id: true, name: true, logoUrl: true } },
        },
      }),
      this.db.epCampusUser.findMany({
        where: { userId, status: 'ACTIVE', deletedAt: null, campus: { deletedAt: null } },
        select: {
          campusRole: true,
          academyId: true,
          campus: { select: { id: true, name: true } },
        },
      }),
      this.db.epClassUser.findMany({
        where: {
          userId,
          status: 'ACTIVE',
          deletedAt: null,
          class: { deletedAt: null, status: 'ACTIVE' },
        },
        select: {
          classRole: true,
          class: { select: { id: true, title: true, academyId: true, campusId: true } },
        },
      }),
    ]);
    // A campus/class role only counts while the academy membership is active.
    const activeAcademies = new Set(academyRows.map((a) => a.academy.id));
    return {
      academies: academyRows.map((a) => ({
        academyId: a.academy.id,
        name: a.academy.name,
        logoUrl: a.academy.logoUrl,
        role: a.academyRole,
      })),
      campuses: campusRows
        .filter((c) => activeAcademies.has(c.academyId))
        .map((c) => ({
          campusId: c.campus.id,
          academyId: c.academyId,
          name: c.campus.name,
          role: c.campusRole,
        })),
      classes: classRows
        .filter((c) => activeAcademies.has(c.class.academyId))
        .map((c) => ({
          classId: c.class.id,
          academyId: c.class.academyId,
          campusId: c.class.campusId,
          title: c.class.title,
          role: c.classRole,
        })),
    };
  }

  findActiveClass(classId: string) {
    return this.db.epClass.findFirst({
      where: { id: classId, deletedAt: null, status: 'ACTIVE', academy: { deletedAt: null } },
      select: { id: true, academyId: true, campusId: true, title: true },
    });
  }

  /** Active students of a class (for class-only games and reports). */
  findClassStudents(classId: string) {
    return this.db.epClassUser.findMany({
      where: { classId, classRole: 'STUDENT', status: 'ACTIVE', deletedAt: null },
      select: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

  /** Active classes in the given academies / campuses / explicit class ids. */
  findClassesInScope(scope: { academyIds: string[]; campusIds: string[]; classIds: string[] }) {
    const or = [
      ...(scope.academyIds.length ? [{ academyId: { in: scope.academyIds } }] : []),
      ...(scope.campusIds.length ? [{ campusId: { in: scope.campusIds } }] : []),
      ...(scope.classIds.length ? [{ id: { in: scope.classIds } }] : []),
    ];
    if (or.length === 0) return Promise.resolve([]);
    return this.db.epClass.findMany({
      where: { OR: or, deletedAt: null, status: 'ACTIVE', academy: { deletedAt: null }, campus: { deletedAt: null } },
      select: {
        id: true,
        title: true,
        academyId: true,
        campusId: true,
        academy: { select: { name: true } },
        campus: { select: { name: true } },
      },
      orderBy: { title: 'asc' },
      take: 500,
    });
  }
}
