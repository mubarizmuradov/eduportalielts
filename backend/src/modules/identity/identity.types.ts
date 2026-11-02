/** EduPortal user as seen by EduPortal IELTS. */
export interface EduUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  language: string;
  isSystemAdmin: boolean;
}

export type AcademyRole = 'OWNER' | 'ADMINISTRATOR' | 'MEMBER';
export type CampusRole = 'MANAGER' | 'MODERATOR' | 'INSTRUCTOR' | 'MENTOR' | 'STUDENT';
export type ClassRole = 'INSTRUCTOR' | 'MENTOR' | 'STUDENT';

export interface MembershipTree {
  academies: Array<{ academyId: string; name: string; logoUrl: string | null; role: AcademyRole }>;
  campuses: Array<{ campusId: string; academyId: string; name: string; role: CampusRole }>;
  classes: Array<{
    classId: string;
    academyId: string;
    campusId: string;
    title: string;
    role: ClassRole;
  }>;
}
