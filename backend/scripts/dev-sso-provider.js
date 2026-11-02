/* eslint-disable */
/**
 * LOCAL DEVELOPMENT ONLY: a fake "EduPortal SSO" page, so the EduPortal IELTS login
 * flow can be tried end to end before EduPortal ships its real SSO endpoint
 * (docs/EDUPORTAL_SSO.md). It behaves like the real one should:
 *   GET  /az/sso/eduielts?client_id&redirect_uri&state   → pick a demo user
 *   POST /az/sso/eduielts  (user id)                     → creates an EduPortal
 *        `sessions` row in the LOCAL eduportal_dev copy, signs an ES256
 *        assertion and auto-submits it to EduPortal IELTS.
 *
 *   EDUPORTAL_ADMIN_URL=postgresql://postgres:postgres@localhost:5432/eduportal_dev \
 *     node scripts/dev-sso-provider.js
 *
 * Then start the API with the env lines it prints. Refuses non-local databases.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@eduielts/eduportal-client');
const { IDS } = require('./seed-dev-eduportal.js');

if (process.env.NODE_ENV === 'production') throw new Error('dev-sso-provider must never run in production');
const PORT = Number(process.env.SSO_DEV_PORT || 4110);
const CLIENT_ID = process.env.EDUPORTAL_SSO_CLIENT_ID || 'eduielts';
const REDIRECT_URI = process.env.SSO_DEV_REDIRECT_URI || 'http://localhost:3200/api/auth/sso/callback';

function adminUrl() {
  const url = process.env.EDUPORTAL_ADMIN_URL;
  if (!url) throw new Error('EDUPORTAL_ADMIN_URL is required');
  const u = new URL(url);
  if (!['localhost', '127.0.0.1'].includes(u.hostname) || !/dev|test/.test(u.pathname)) {
    throw new Error(`Refusing ${u.hostname}${u.pathname}: only local dev/test databases`);
  }
  return url;
}

function keys() {
  const dir = path.join(__dirname, '..', '.dev-sso');
  const privPath = path.join(dir, 'private.pem');
  const pubPath = path.join(dir, 'public.pem');
  if (!fs.existsSync(privPath)) {
    fs.mkdirSync(dir, { recursive: true });
    const k = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
    fs.writeFileSync(privPath, k.privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
    fs.writeFileSync(pubPath, k.publicKey.export({ type: 'spki', format: 'pem' }));
  }
  return { priv: fs.readFileSync(privPath, 'utf8'), pub: fs.readFileSync(pubPath, 'utf8') };
}

const USERS = [
  ['teacher', 'teacher@demo.az', 'Müəllim (sinif INSTRUCTOR)'],
  ['mentor', 'mentor@demo.az', 'Mentor (sinif MENTOR)'],
  ['manager', 'manager@demo.az', 'Filial meneceri (campus MANAGER)'],
  ['owner', 'owner@demo.az', 'Akademiya sahibi (OWNER)'],
  ['student1', 'student1@demo.az', 'Tələbə 1'],
  ['student2', 'student2@demo.az', 'Tələbə 2'],
  ['outsider', 'outsider@demo.az', 'Sinifdə olmayan istifadəçi'],
];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const page = (body) =>
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Fake EduPortal SSO</title>
<body style="font-family:system-ui;max-width:420px;margin:40px auto;padding:0 16px">${body}</body>`;

async function main() {
  const db = new PrismaClient({ datasourceUrl: adminUrl() });
  const { priv, pub } = keys();

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname !== '/az/sso/eduielts') return res.writeHead(404).end('not found');
    let params = url.searchParams;
    if (req.method === 'POST') {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      params = new URLSearchParams(raw);
    }
    const clientId = params.get('client_id');
    const redirectUri = params.get('redirect_uri');
    const state = params.get('state') || '';
    // Exactly what the real endpoint must do: only registered clients and exact redirect URIs.
    if (clientId !== CLIENT_ID || redirectUri !== REDIRECT_URI || !/^[A-Za-z0-9_-]{16,128}$/.test(state)) {
      return res.writeHead(400, { 'content-type': 'text/html; charset=utf-8' }).end(page('<h1>invalid_request</h1>'));
    }
    const hidden = `<input type="hidden" name="client_id" value="${esc(clientId)}"><input type="hidden" name="redirect_uri" value="${esc(redirectUri)}"><input type="hidden" name="state" value="${esc(state)}">`;

    if (req.method === 'GET') {
      const buttons = USERS.map(
        ([key, email, label]) =>
          `<button name="user" value="${key}" style="display:block;width:100%;margin:8px 0;padding:12px;font-size:16px">${esc(email)}<br><small>${esc(label)}</small></button>`,
      ).join('');
      return res
        .writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        .end(page(`<h1>Fake EduPortal</h1><p>LOCAL DEV ONLY. Choose who is "signed in on eduportal.az":</p><form method="post">${hidden}${buttons}</form><form method="post">${hidden}<button name="cancel" value="1">Cancel</button></form>`));
    }

    if (params.get('cancel')) {
      return res
        .writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        .end(page(`<form id="f" method="post" action="${esc(redirectUri)}"><input type="hidden" name="error" value="access_denied"><input type="hidden" name="state" value="${esc(state)}"></form><script>document.getElementById('f').submit()</script>`));
    }
    const userId = IDS[params.get('user')];
    if (!userId) return res.writeHead(400).end('unknown user');
    const sessionId = crypto.randomUUID();
    await db.$executeRawUnsafe(
      `INSERT INTO sessions (id, user_id, device_type, hashed_refresh_token, expires_at)
       VALUES ($1,$2,'DESKTOP','dev-sso', now() + interval '7 days')
       ON CONFLICT (user_id, device_type) DO UPDATE SET expires_at = EXCLUDED.expires_at`,
      sessionId,
      userId,
    );
    const [row] = await db.$queryRawUnsafe(`SELECT id FROM sessions WHERE user_id = $1 AND device_type = 'DESKTOP'`, userId);
    const token = jwt.sign({ sid: row.id, nonce: state }, priv, {
      algorithm: 'ES256',
      keyid: 'dev',
      issuer: 'eduportal',
      audience: CLIENT_ID,
      subject: userId,
      expiresIn: 60,
      jwtid: crypto.randomUUID(),
    });
    res
      .writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' })
      .end(page(`<p>Redirecting to EduPortal IELTS…</p><form id="f" method="post" action="${esc(redirectUri)}"><input type="hidden" name="token" value="${esc(token)}"><input type="hidden" name="state" value="${esc(state)}"><noscript><button>Continue</button></noscript></form><script>document.getElementById('f').submit()</script>`));
  });

  server.listen(PORT, () => {
    console.log(`Fake EduPortal SSO on http://localhost:${PORT}/az/sso/eduielts`);
    console.log('Start the EduPortal IELTS API with:');
    console.log(`  PUBLIC_URL=http://localhost:3200`);
    console.log(`  EDUPORTAL_SSO_AUTHORIZE_URL=http://localhost:${PORT}/az/sso/eduielts`);
    console.log(`  EDUPORTAL_SSO_PUBLIC_KEY="${pub.trim().replace(/\n/g, '\\n')}"`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
