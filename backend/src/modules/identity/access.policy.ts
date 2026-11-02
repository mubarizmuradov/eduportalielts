import type { MembershipTree } from './identity.types';

/**
 * Who may do what, from EduPortal roles only (pure, unit tested).
 *
 * Staff = the people allowed to create IELTS mock tests, assign them to
 * classes and mark Writing / Speaking:
 *   academy OWNER, campus MANAGER, teacher (INSTRUCTOR) and MENTOR.
 *
 * Create / see tests of an academy:
 *   academy OWNER, campus MANAGER | INSTRUCTOR | MENTOR, class INSTRUCTOR | MENTOR.
 * Assign to / mark a class:
 *   OWNER of the class academy, MANAGER of the class campus,
 *   INSTRUCTOR | MENTOR of that class.
 * Sit a test: STUDENT of the class it was assigned to.
 * EduPortal system admins (users.role = ADMIN) may do everything.
 */
const STAFF_ACADEMY_ROLES = new Set(['OWNER']);
const STAFF_CAMPUS_ROLES = new Set(['MANAGER', 'INSTRUCTOR', 'MENTOR']);
const STAFF_CLASS_ROLES = new Set(['INSTRUCTOR', 'MENTOR']);

export function staffAcademyIds(tree: MembershipTree): string[] {
  const ids = new Set<string>();
  for (const a of tree.academies) if (STAFF_ACADEMY_ROLES.has(a.role)) ids.add(a.academyId);
  for (const c of tree.campuses) if (STAFF_CAMPUS_ROLES.has(c.role)) ids.add(c.academyId);
  for (const c of tree.classes) if (STAFF_CLASS_ROLES.has(c.role)) ids.add(c.academyId);
  return [...ids];
}

export function canAuthorInAcademy(tree: MembershipTree, academyId: string, isSystemAdmin = false) {
  return isSystemAdmin || staffAcademyIds(tree).includes(academyId);
}

export function canManageClass(
  tree: MembershipTree,
  cls: { id: string; academyId: string; campusId: string },
  isSystemAdmin = false,
) {
  if (isSystemAdmin) return true;
  if (tree.academies.some((a) => a.academyId === cls.academyId && a.role === 'OWNER')) return true;
  if (tree.campuses.some((c) => c.campusId === cls.campusId && c.role === 'MANAGER')) return true;
  return tree.classes.some((c) => c.classId === cls.id && STAFF_CLASS_ROLES.has(c.role));
}

/** Where to look for the classes a user may assign tests to. */
export function manageableClassScope(tree: MembershipTree) {
  return {
    academyIds: tree.academies.filter((a) => a.role === 'OWNER').map((a) => a.academyId),
    campusIds: tree.campuses.filter((c) => c.role === 'MANAGER').map((c) => c.campusId),
    classIds: tree.classes.filter((c) => STAFF_CLASS_ROLES.has(c.role)).map((c) => c.classId),
  };
}

export function studentClassIds(tree: MembershipTree): string[] {
  return tree.classes.filter((c) => c.role === 'STUDENT').map((c) => c.classId);
}

export function isClassStudent(tree: MembershipTree, classId: string) {
  return tree.classes.some((c) => c.classId === classId && c.role === 'STUDENT');
}
