/* eslint-disable */
/**
 * LOCAL DEVELOPMENT / TEST ONLY.
 * Inserts demo users, an academy, a campus and a class into a LOCAL copy of the
 * EduPortal database (created with EduPortal's own migrations), so EduPortal IELTS can
 * be developed without touching a real EduPortal instance.
 *
 *   EDUPORTAL_ADMIN_URL=postgresql://postgres:postgres@localhost:5432/eduportal_dev node scripts/seed-dev-eduportal.js
 *
 * Refuses to run against non-local hosts or databases whose name does not
 * contain "dev" or "test".
 */
const { PrismaClient } = require('@eduielts/eduportal-client');

function adminUrl() {
  const url = process.env.EDUPORTAL_ADMIN_URL;
  if (!url) throw new Error('EDUPORTAL_ADMIN_URL is required');
  const u = new URL(url);
  if (!['localhost', '127.0.0.1', 'eduportal-dev-db'].includes(u.hostname) || !/dev|test/.test(u.pathname)) {
    throw new Error(`Refusing to seed ${u.hostname}${u.pathname}: only local dev/test databases`);
  }
  return url;
}

const IDS = {
  academy: '0a000000-0000-4000-8000-000000000001',
  campus: '0c000000-0000-4000-8000-000000000001',
  course: '0d000000-0000-4000-8000-000000000002',
  class: '0e000000-0000-4000-8000-000000000002',
  owner: '01000000-0000-4000-8000-000000000001',
  teacher: '01000000-0000-4000-8000-000000000002',
  student1: '01000000-0000-4000-8000-000000000003',
  student2: '01000000-0000-4000-8000-000000000004',
  outsider: '01000000-0000-4000-8000-000000000005',
  mentor: '01000000-0000-4000-8000-000000000007',
  manager: '01000000-0000-4000-8000-000000000008',
};

const users = [
  [IDS.owner, 'owner@demo.az', 'Rəşad', 'Əliyev', false],
  [IDS.teacher, 'teacher@demo.az', 'Aysel', 'Məmmədova', false],
  [IDS.student1, 'student1@demo.az', 'Nərgiz', 'Hüseynova', false],
  [IDS.student2, 'student2@demo.az', 'Tural', 'Quliyev', false],
  [IDS.outsider, 'outsider@demo.az', 'Kənan', 'Babayev', false],
  [IDS.mentor, 'mentor@demo.az', 'Leyla', 'Kərimova', false],
  [IDS.manager, 'manager@demo.az', 'Elvin', 'Səfərov', false],
];

async function main() {
  const url = adminUrl();
  const db = new PrismaClient({ datasourceUrl: url });
  const q = (sql, ...params) => db.$executeRawUnsafe(sql, ...params);
  for (const [id, email, first, last, twofa] of users) {
    await q(
      `INSERT INTO users (id, email, first_name, last_name, full_name_search, phone_number, gender, date_of_birth, updated_at, is_two_factor_enabled)
       VALUES ($1,$2,$3,$4,$5,'+994500000000','MALE','2000-01-01',now(),$6)
       ON CONFLICT (id) DO UPDATE SET deleted_at = NULL`,
      id, email, first, last, `${first} ${last}`.toLowerCase(), twofa,
    );
  }
  await q(`INSERT INTO academies (id, name, normalized_name, updated_at) VALUES ($1,'Demo Akademiya','demo akademiya',now()) ON CONFLICT DO NOTHING`, IDS.academy);
  await q(`INSERT INTO campuses (id, academy_id, name, phone_primary, city, country, timezone, updated_at, is_main_campus) VALUES ($1,$2,'Mərkəz filialı','+994120000000','Bakı','AZ','Asia/Baku',now(),true) ON CONFLICT DO NOTHING`, IDS.campus, IDS.academy);
  await q(`INSERT INTO courses (id, academy_id, title, updated_at) VALUES ($1,$2,'IELTS Hazırlıq',now()) ON CONFLICT DO NOTHING`, IDS.course, IDS.academy);
  await q(`INSERT INTO classes (id, campus_id, course_id, academy_id, title, title_search, updated_at) VALUES ($1,$2,$3,$4,'IELTS 7.0 – Axşam qrupu','ielts 7.0 – axşam qrupu',now()) ON CONFLICT DO NOTHING`, IDS.class, IDS.campus, IDS.course, IDS.academy);

  const academyRoles = [[IDS.owner, 'OWNER'], [IDS.teacher, 'MEMBER'], [IDS.mentor, 'MEMBER'], [IDS.manager, 'MEMBER'], [IDS.student1, 'MEMBER'], [IDS.student2, 'MEMBER']];
  for (const [userId, role] of academyRoles) {
    await q(`INSERT INTO academy_users (id, academy_id, user_id, "academyRole", status, updated_at) VALUES (gen_random_uuid()::text,$1,$2,$3::"AcademyRole",'ACTIVE',now()) ON CONFLICT (user_id, academy_id) DO NOTHING`, IDS.academy, userId, role);
  }
  const campusRoles = [[IDS.teacher, 'INSTRUCTOR'], [IDS.manager, 'MANAGER'], [IDS.student1, 'STUDENT'], [IDS.student2, 'STUDENT']];
  for (const [userId, role] of campusRoles) {
    await q(`INSERT INTO user_campuses (id, user_id, campus_id, academy_id, "campusRole", status, updated_at) VALUES (gen_random_uuid()::text,$1,$2,$3,$4::"CampusRole",'ACTIVE',now()) ON CONFLICT (user_id, campus_id) DO NOTHING`, userId, IDS.campus, IDS.academy, role);
  }
  const classRoles = [[IDS.teacher, 'INSTRUCTOR'], [IDS.mentor, 'MENTOR'], [IDS.student1, 'STUDENT'], [IDS.student2, 'STUDENT']];
  for (const [userId, role] of classRoles) {
    await q(`INSERT INTO class_users (id, class_id, user_id, academy_id, campus_id, "classRole", status, updated_at) VALUES (gen_random_uuid()::text,$1,$2,$3,$4,$5::"ClassRole",'ACTIVE',now()) ON CONFLICT (user_id, class_id) DO NOTHING`, IDS.class, userId, IDS.academy, IDS.campus, role);
  }
  await db.$disconnect();
  console.log('Seeded demo EduPortal data. Sign in with scripts/dev-sso-provider.js (no passwords).');
}

module.exports = { IDS };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
