import {
  canAuthorInAcademy,
  canManageClass,
  isClassStudent,
  manageableClassScope,
  staffAcademyIds,
  studentClassIds,
} from './access.policy';
import type { MembershipTree } from './identity.types';

const tree = (over: Partial<MembershipTree>): MembershipTree => ({ academies: [], campuses: [], classes: [], ...over });
const cls = { id: 'cls1', academyId: 'ac1', campusId: 'cp1' };
const klass = (classId: string, role: 'INSTRUCTOR' | 'MENTOR' | 'STUDENT') => ({
  classId,
  academyId: 'ac1',
  campusId: 'cp1',
  title: classId,
  role,
});

describe('IELTS access policy (EduPortal roles)', () => {
  it('owner, manager, teacher and mentor are staff', () => {
    expect(staffAcademyIds(tree({ academies: [{ academyId: 'ac1', name: 'A', logoUrl: null, role: 'OWNER' }] }))).toEqual(['ac1']);
    expect(staffAcademyIds(tree({ campuses: [{ campusId: 'cp1', academyId: 'ac1', name: 'C', role: 'MANAGER' }] }))).toEqual(['ac1']);
    expect(staffAcademyIds(tree({ classes: [klass('cls1', 'INSTRUCTOR')] }))).toEqual(['ac1']);
    expect(staffAcademyIds(tree({ classes: [klass('cls1', 'MENTOR')] }))).toEqual(['ac1']);
  });

  it('plain members, administrators, moderators and students are not', () => {
    const t = tree({
      academies: [
        { academyId: 'ac1', name: 'A', logoUrl: null, role: 'MEMBER' },
        { academyId: 'ac2', name: 'B', logoUrl: null, role: 'ADMINISTRATOR' },
      ],
      campuses: [{ campusId: 'cp1', academyId: 'ac1', name: 'C', role: 'MODERATOR' }],
      classes: [klass('cls1', 'STUDENT')],
    });
    expect(staffAcademyIds(t)).toEqual([]);
    expect(canAuthorInAcademy(t, 'ac1')).toBe(false);
    expect(canAuthorInAcademy(t, 'ac1', true)).toBe(true);
    expect(canManageClass(t, cls)).toBe(false);
  });

  it('teachers and mentors manage only their own classes', () => {
    const t = tree({ classes: [klass('cls1', 'MENTOR'), klass('cls2', 'STUDENT')] });
    expect(canManageClass(t, cls)).toBe(true);
    expect(canManageClass(t, { ...cls, id: 'cls2' })).toBe(false);
    expect(isClassStudent(t, 'cls2')).toBe(true);
    expect(studentClassIds(t)).toEqual(['cls2']);
  });

  it('managers manage their campus, owners their academy', () => {
    const manager = tree({ campuses: [{ campusId: 'cp1', academyId: 'ac1', name: 'C', role: 'MANAGER' }] });
    expect(canManageClass(manager, cls)).toBe(true);
    expect(canManageClass(manager, { ...cls, campusId: 'cp2' })).toBe(false);
    const owner = tree({ academies: [{ academyId: 'ac1', name: 'A', logoUrl: null, role: 'OWNER' }] });
    expect(canManageClass(owner, { ...cls, campusId: 'cp9' })).toBe(true);
    expect(manageableClassScope(owner)).toEqual({ academyIds: ['ac1'], campusIds: [], classIds: [] });
  });
});
