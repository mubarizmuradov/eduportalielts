/**
 * End-to-end test against REAL databases:
 *  - TEST_DATABASE_URL: EduPortal IELTS test database (migrated and emptied by this test)
 *  - EDUPORTAL_DATABASE_URL: EduPortal database through the SELECT-only role
 *  - EDUPORTAL_ADMIN_URL: same EduPortal DB as superuser, ONLY to seed fixtures
 * The EduPortal DB must be a LOCAL copy built from EduPortal's own migrations.
 */
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaClient as EduClient } from '@eduielts/eduportal-client';
import { PrismaClient as IeltsClient } from '@eduielts/ielts-client';
import { execSync } from 'node:child_process';
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';

/* eslint-disable @typescript-eslint/no-require-imports */
const { IDS } = require('../scripts/seed-dev-eduportal.js');
const { makeSamplePackage } = require('../samples/sample-package.js');
const { toneWav } = require('../samples/media.js');
/* eslint-enable @typescript-eslint/no-require-imports */

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/ielts_test';
process.env.EDUPORTAL_DATABASE_URL ??= 'postgresql://eduielts_readonly:readonly@localhost:5432/eduportal_dev';
process.env.EDUPORTAL_ADMIN_URL ??= 'postgresql://postgres:postgres@localhost:5432/eduportal_dev';
process.env.IELTS_JWT_SECRET = 'e2e-ielts-secret-0123456789abcdef0123456789';
process.env.CORS_ORIGIN = 'http://localhost:3200';
process.env.UPLOAD_DIR = '/tmp/eduielts-e2e-uploads';
process.env.NODE_ENV = 'test';
const SSO_KEYS = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const SSO_PRIVATE = SSO_KEYS.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
process.env.EDUPORTAL_SSO_AUTHORIZE_URL = 'http://eduportal.test/az/sso/eduielts';
process.env.EDUPORTAL_SSO_PUBLIC_KEY = SSO_KEYS.publicKey.export({ type: 'spki', format: 'pem' }).toString();
process.env.PUBLIC_URL = 'http://localhost:3200';

const H = { 'x-eduielts-request': '1' };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

describe('EduPortal IELTS e2e (real EduPortal schema)', () => {
  let app: INestApplication;
  let base: string;
  let db: IeltsClient;
  const cookies: Record<string, string> = {};

  beforeAll(async () => {
    if (!/test/.test(new URL(process.env.DATABASE_URL!).pathname))
      throw new Error('TEST_DATABASE_URL must point to a database whose name contains "test"');
    execSync('npx prisma migrate deploy --schema prisma/ielts/schema.prisma', { env: { ...process.env }, stdio: 'ignore' });
    db = new IeltsClient({ datasourceUrl: process.env.DATABASE_URL });
    await db.$executeRawUnsafe(
      'TRUNCATE speaking_recordings, attempts, assignments, test_assets, ielts_tests, auth_sessions, sso_assertions CASCADE',
    );
    execSync('node scripts/seed-dev-eduportal.js', { env: { ...process.env }, stdio: 'ignore' });
    const { AppModule } = await import('../src/app.module');
    const { configureApp } = await import('../src/main');
    const nest = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ['error'], bodyParser: false });
    await configureApp(nest);
    await nest.listen(0, '127.0.0.1');
    app = nest;
    base = (await nest.getUrl()).replace('[::1]', 'localhost');
    for (const who of ['teacher', 'mentor', 'manager', 'owner', 'student1', 'student2', 'outsider']) cookies[who] = await login(who);
  });

  afterAll(async () => {
    await db?.$disconnect();
    await app?.close();
  });

  /** The only way in: EduPortal SSO (the test plays EduPortal). */
  async function login(who: string) {
    const userId: string = IDS[who];
    const admin = new EduClient({ datasourceUrl: process.env.EDUPORTAL_ADMIN_URL });
    await admin.$executeRawUnsafe(
      `INSERT INTO sessions (id, user_id, device_type, hashed_refresh_token, expires_at)
       VALUES ($1,$2,'MOBILE','x', now() + interval '1 day')
       ON CONFLICT (user_id, device_type) DO UPDATE SET expires_at = EXCLUDED.expires_at`,
      randomUUID(),
      userId,
    );
    const [row] = await admin.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM sessions WHERE user_id = $1 AND device_type = 'MOBILE'`,
      userId,
    );
    await admin.$disconnect();
    const start = await request(base).get('/auth/sso/start').expect(302);
    const state = new URL(start.headers.location).searchParams.get('state')!;
    const stateCookie = (start.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('ei_sso_state='))!.split(';')[0];
    const token = jwt.sign({ sid: row.id, nonce: state }, SSO_PRIVATE, {
      algorithm: 'ES256',
      issuer: 'eduportal',
      audience: 'eduielts',
      subject: userId,
      expiresIn: 60,
      jwtid: randomUUID(),
    });
    const res = await request(base).post('/auth/sso/callback').set('Cookie', stateCookie).type('form').send({ token, state }).expect(303);
    return (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('ei_session='))!.split(';')[0];
  }

  const as = (who: string) => ({
    get: (url: string) => request(base).get(url).set('Cookie', cookies[who]),
    post: (url: string, body?: object) => request(base).post(url).set('Cookie', cookies[who]).set(H).send(body),
    put: (url: string, body?: object) => request(base).put(url).set('Cookie', cookies[who]).set(H).send(body),
    patch: (url: string, body?: object) => request(base).patch(url).set('Cookie', cookies[who]).set(H).send(body),
    del: (url: string) => request(base).delete(url).set('Cookie', cookies[who]).set(H),
  });

  let testId: string;
  let assignmentId: string;
  let attemptId: string;

  it('health checks both databases and EduPortal is read-only', async () => {
    const r = await request(base).get('/health/ready').expect(200);
    expect(r.body).toMatchObject({ ieltsDatabase: true, eduportalDatabase: true });
    const ro = new EduClient({ datasourceUrl: process.env.EDUPORTAL_DATABASE_URL });
    await expect(ro.$executeRawUnsafe(`UPDATE users SET first_name = 'x' WHERE id = '${IDS.owner}'`)).rejects.toThrow();
    await ro.$disconnect();
  });

  it('owner, manager, teacher and mentor are staff; students are not', async () => {
    for (const who of ['owner', 'manager', 'teacher', 'mentor']) {
      const me = await as(who).get('/auth/me').expect(200);
      expect(me.body.staffAcademyIds).toEqual([IDS.academy]);
    }
    const s = await as('student1').get('/auth/me').expect(200);
    expect(s.body.staffAcademyIds).toEqual([]);
    await request(base).get('/tests').expect(401);
  });

  it('validates packages and refuses non-IELTS ones', async () => {
    const bad = makeSamplePackage();
    bad.reading.sections[0].questionGroups[0].questions[0].number = 7;
    const v = await as('teacher').post('/tests/validate', { package: bad }).expect(200);
    expect(v.body.ok).toBe(false);
    expect(v.body.errors.length).toBeGreaterThan(0);
    const imp = await as('teacher').post('/tests/import', { academyId: IDS.academy, package: bad }).expect(422);
    expect(imp.body.code).toBe('INVALID_PACKAGE');
    const good = await as('teacher').post('/tests/validate', { package: makeSamplePackage() }).expect(200);
    expect(good.body.ok).toBe(true);
    expect(good.body.summary.listening.questions).toBe(40);
  });

  it('only staff import tests into their academy', async () => {
    await as('student1').post('/tests/import', { academyId: IDS.academy, package: makeSamplePackage() }).expect(403);
    await as('outsider').post('/tests/import', { academyId: IDS.academy, package: makeSamplePackage() }).expect(403);
    const r = await as('teacher').post('/tests/import', { academyId: IDS.academy, package: makeSamplePackage() }).expect(201);
    testId = r.body.id;
    const list = await as('mentor').get('/tests').expect(200);
    expect(list.body.map((t: Any) => t.id)).toContain(testId);
    const preview = await as('manager').get(`/tests/${testId}`).expect(200);
    expect(preview.body.staff.listening[0].transcript).toContain('Fletcher');
    expect(preview.body.answerKey).toBeUndefined();
    await as('outsider').get(`/tests/${testId}`).expect(403);
    const audio = await as('teacher').get(`/tests/${testId}/assets/listening-part-1`).expect(200);
    expect(audio.headers['content-type']).toBe('audio/wav');
  });

  it('assigns a test to a class the user manages', async () => {
    const classes = await as('mentor').get('/assignments/classes').expect(200);
    expect(classes.body.map((c: Any) => c.id)).toContain(IDS.class);
    const window = { opensAt: new Date(Date.now() - 60_000), closesAt: new Date(Date.now() + 86_400_000) };
    await as('student1').post('/assignments', { testId, classId: IDS.class, ...window }).expect(403);
    const r = await as('mentor').post('/assignments', { testId, classId: IDS.class, title: 'Mock 1', ...window }).expect(201);
    assignmentId = r.body.id;
    const mine = await as('student1').get('/assignments/mine').expect(200);
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0]).toMatchObject({ id: assignmentId, title: 'Mock 1', attempt: null });
    expect((await as('outsider').get('/assignments/mine').expect(200)).body).toHaveLength(0);
    await as('outsider').post(`/assignments/${assignmentId}/start`).expect(403);
  });

  it('runs Listening → Reading → Writing → Speaking with server-side rules', async () => {
    const start = await as('student1').post(`/assignments/${assignmentId}/start`).expect(200);
    attemptId = start.body.id;
    expect((await as('student1').post(`/assignments/${assignmentId}/start`).expect(200)).body.id).toBe(attemptId);

    let s = await as('student1').get(`/attempts/${attemptId}/state`).expect(200);
    expect(s.body.attempt.currentModule).toBe('listening');
    expect(s.body.content.parts).toHaveLength(4);
    expect(JSON.stringify(s.body.content)).not.toMatch(/"answers?"\s*:|transcript/);
    expect(s.body.candidate.number).toMatch(/^\d{6}$/);
    await as('student2').get(`/attempts/${attemptId}/state`).expect(404);
    await as('student1').get(`/tests/${testId}/assets/listening-part-1`).expect(200);

    await as('student1')
      .put(`/attempts/${attemptId}/answers`, { module: 'listening', answers: { 1: 'fletcher', 2: '42', 3: 'doctor', 19: 'D', 20: 'B', 99: 'x' } })
      .expect(200);
    s = await as('student1').post(`/attempts/${attemptId}/finish-module`, { module: 'listening' }).expect(200);
    expect(s.body.attempt.currentModule).toBe('reading');
    expect(s.body.content.sections).toHaveLength(3);
    // The recording is gone once Listening is over; no going back.
    await as('student1').get(`/tests/${testId}/assets/listening-part-1`).expect(403);
    await as('student1').put(`/attempts/${attemptId}/answers`, { module: 'listening', answers: { 4: '3' } }).expect(409);

    await as('student1').put(`/attempts/${attemptId}/answers`, { module: 'reading', answers: { 1: 'TRUE', 4: 'NOT_GIVEN', 14: 'vii', 23: 'A' } }).expect(200);
    s = await as('student1').post(`/attempts/${attemptId}/finish-module`, { module: 'reading' }).expect(200);
    expect(s.body.attempt.currentModule).toBe('writing');
    expect(s.body.content.tasks).toHaveLength(2);
    await as('student1').put(`/attempts/${attemptId}/writing`, { task1: 'The chart shows commuters.', task2: 'Some people believe…' }).expect(200);
    s = await as('student1').post(`/attempts/${attemptId}/finish-module`, { module: 'writing' }).expect(200);
    expect(s.body.attempt.currentModule).toBe('speaking');

    const wav = Buffer.from(toneWav(1), 'base64');
    await request(base).post(`/attempts/${attemptId}/recordings?part=1&index=0&durationMs=1000`).set('Cookie', cookies.student1).set(H).attach('audio', wav, 'a.wav').expect(201);
    await request(base).post(`/attempts/${attemptId}/recordings?part=2&index=0`).set('Cookie', cookies.student1).set(H).attach('audio', wav, 'b.wav').expect(201);
    await request(base).post(`/attempts/${attemptId}/recordings?part=1&index=40`).set('Cookie', cookies.student1).set(H).attach('audio', wav, 'a.wav').expect(400);
    await request(base).post(`/attempts/${attemptId}/recordings?part=1&index=1`).set('Cookie', cookies.student1).set(H).attach('audio', Buffer.from('not audio at all'), 'x.wav').expect(415);
    s = await as('student1').get(`/attempts/${attemptId}/state`).expect(200);
    expect(s.body.saved.recordings).toHaveLength(2);
    s = await as('student1').post(`/attempts/${attemptId}/finish-module`, { module: 'speaking' }).expect(200);
    expect(s.body.attempt).toMatchObject({ currentModule: null, status: 'SUBMITTED' });
  });

  it('teachers mark Writing and Speaking; results reach students only when released', async () => {
    const blocked = await as('student1').get(`/attempts/${attemptId}/result`).expect(403);
    expect(blocked.body.code).toBe('RESULTS_NOT_RELEASED');

    const report = await as('teacher').get(`/assignments/${assignmentId}`).expect(200);
    const row = report.body.rows.find((r: Any) => r.user.id === IDS.student1);
    expect(row.attempt).toMatchObject({ status: 'SUBMITTED', listeningRaw: 4, readingRaw: 4 });
    expect(report.body.rows.some((r: Any) => r.user.id === IDS.student2 && r.attempt === null)).toBe(true);

    await as('student2').put(`/attempts/${attemptId}/grade`, { speaking: { fc: 6, lr: 6, gra: 6, p: 6 } }).expect(403);
    const graded = await as('teacher')
      .put(`/attempts/${attemptId}/grade`, {
        writing: { task1: { ta: 6, cc: 6, lr: 6, gra: 5 }, task2: { ta: 6, cc: 7, lr: 6, gra: 6 }, comment: 'Good structure.' },
        speaking: { fc: 6, lr: 6, gra: 6, p: 7 },
      })
      .expect(200);
    expect(graded.body.attempt.status).toBe('GRADED');
    expect(graded.body.bands).toMatchObject({ listening: 2.5, reading: 2.5, writing: 6, speaking: 6.5, overall: 4.5 }) // (2.5+2.5+6+6.5)/4 = 4.375;
    expect(graded.body.transcripts).toHaveLength(4);

    await as('teacher').patch(`/assignments/${assignmentId}`, { resultsReleased: true }).expect(200);
    const res = await as('student1').get(`/attempts/${attemptId}/result`).expect(200);
    expect(res.body.staff).toBe(false);
    expect(res.body.transcripts).toBeUndefined();
    expect(res.body.bands.overall).toBe(4.5);
    expect(res.body.listening[0]).toMatchObject({ number: 1, answer: 'fletcher', correct: true, key: 'Fletcher' });
    expect(res.body.listening[2]).toMatchObject({ number: 3, correct: false, key: 'nurse' });
    const rec = res.body.speaking.recordings[0];
    const audio = await as('student1').get(`/attempts/${attemptId}/recordings/${rec.id}`).expect(200);
    expect(audio.headers['content-type']).toBe('audio/wav');
    await as('student2').get(`/attempts/${attemptId}/recordings/${rec.id}`).expect(403);
    const mine = await as('student1').get('/assignments/mine').expect(200);
    expect(mine.body[0].attempt).toMatchObject({ status: 'GRADED', overallBand: 4.5 });
  });

  it('auto-submits a module when its time is over', async () => {
    const { id } = (await as('student2').post(`/assignments/${assignmentId}/start`).expect(200)).body;
    await as('student2').put(`/attempts/${id}/answers`, { module: 'listening', answers: { 1: 'Fletcher' } }).expect(200);
    const past = new Date(Date.now() - 5 * 60_000);
    await db.attempt.update({ where: { id }, data: { moduleDeadline: past } });
    const s = await as('student2').get(`/attempts/${id}/state`).expect(200);
    expect(s.body.attempt.currentModule).toBe('reading');
    // The next module started at the old deadline, not now.
    expect(new Date(s.body.attempt.moduleDeadline).getTime()).toBe(past.getTime() + 60 * 60_000);
    const row = await db.attempt.findUniqueOrThrow({ where: { id } });
    expect(row.listeningRaw).toBe(1);
  });

  it('keeps assignments with attempts', async () => {
    await as('teacher').del(`/assignments/${assignmentId}`).expect(409);
  });
});
