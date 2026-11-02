import { generateKeyPairSync, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { safeNextPath, SsoAssertionError, verifySsoAssertion } from './sso-assertion';

const ec = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 });
const pem = (k: typeof ec.publicKey) => k.export({ type: 'spki', format: 'pem' }).toString();
const priv = (k: typeof ec.privateKey) => k.export({ type: 'pkcs8', format: 'pem' }).toString();

const USER = randomUUID();
const SID = randomUUID();
const STATE = 'state-abc-0123456789';
const opts = { publicKey: pem(ec.publicKey), issuer: 'eduportal', audience: 'eduielts', expectedNonce: STATE };

function sign(claims: Record<string, unknown> = {}, signOpts: jwt.SignOptions = {}, key = priv(ec.privateKey)) {
  return jwt.sign({ sid: SID, nonce: STATE, ...claims }, key, {
    algorithm: 'ES256',
    issuer: 'eduportal',
    audience: 'eduielts',
    subject: USER,
    expiresIn: 60,
    jwtid: randomUUID(),
    ...signOpts,
  });
}

function code(fn: () => unknown) {
  try {
    fn();
  } catch (e) {
    return e instanceof SsoAssertionError ? e.code : 'OTHER';
  }
  return 'OK';
}

describe('verifySsoAssertion', () => {
  it('accepts a valid ES256 assertion', () => {
    const a = verifySsoAssertion(sign(), opts);
    expect(a.userId).toBe(USER);
    expect(a.eduportalSessionId).toBe(SID);
    expect(a.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('accepts RS256 too', () => {
    const t = sign({}, { algorithm: 'RS256' }, priv(rsa.privateKey));
    expect(verifySsoAssertion(t, { ...opts, publicKey: pem(rsa.publicKey) }).userId).toBe(USER);
  });

  it('rejects wrong audience, issuer, key and expired tokens', () => {
    expect(code(() => verifySsoAssertion(sign({}, { audience: 'other-app' }), opts))).toBe('SSO_INVALID_TOKEN');
    expect(code(() => verifySsoAssertion(sign({}, { issuer: 'evil' }), opts))).toBe('SSO_INVALID_TOKEN');
    const other = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    expect(code(() => verifySsoAssertion(sign({}, {}, priv(other.privateKey)), opts))).toBe('SSO_INVALID_TOKEN');
    const old = sign({ iat: Math.floor(Date.now() / 1000) - 600 }, { expiresIn: 60 });
    expect(code(() => verifySsoAssertion(old, opts))).toBe('SSO_INVALID_TOKEN');
  });

  it('rejects long-lived assertions', () => {
    expect(code(() => verifySsoAssertion(sign({}, { expiresIn: 3600 }), opts))).toBe('SSO_INVALID_TOKEN');
  });

  it('rejects an assertion issued for another browser (nonce)', () => {
    expect(code(() => verifySsoAssertion(sign({ nonce: 'someone-else' }), opts))).toBe('SSO_STATE_MISMATCH');
    expect(code(() => verifySsoAssertion(sign({ nonce: undefined }), opts))).toBe('SSO_STATE_MISMATCH');
  });

  it('requires sub, sid and jti', () => {
    expect(code(() => verifySsoAssertion(sign({ sid: undefined }), opts))).toBe('SSO_INVALID_TOKEN');
    expect(code(() => verifySsoAssertion(sign({}, { subject: 'not-a-uuid' }), opts))).toBe('SSO_INVALID_TOKEN');
    expect(code(() => verifySsoAssertion(sign({}, { jwtid: 'short' }), opts))).toBe('SSO_INVALID_TOKEN');
  });

  it('blocks algorithm confusion: HS256 signed with the public key, and alg=none', () => {
    const hs = jwt.sign({ sid: SID, nonce: STATE, jti: randomUUID() }, Buffer.from(opts.publicKey), {
      algorithm: 'HS256',
      issuer: 'eduportal',
      audience: 'eduielts',
      subject: USER,
      expiresIn: 60,
    });
    expect(code(() => verifySsoAssertion(hs, opts))).toBe('SSO_INVALID_TOKEN');
    const none = jwt.sign({ sid: SID, nonce: STATE, jti: randomUUID() }, '', {
      algorithm: 'none',
      issuer: 'eduportal',
      audience: 'eduielts',
      subject: USER,
      expiresIn: 60,
    });
    expect(code(() => verifySsoAssertion(none, opts))).toBe('SSO_INVALID_TOKEN');
  });
});

describe('safeNextPath', () => {
  it.each([
    ['/dashboard', '/dashboard'],
    ['/tests/1?x=1', '/tests/1?x=1'],
    ['https://evil.az', '/dashboard'],
    ['//evil.az', '/dashboard'],
    ['/\\evil.az', '/dashboard'],
    ['/a\nb', '/dashboard'],
    ['/api/auth/sso/start', '/dashboard'],
    [undefined, '/dashboard'],
    ['', '/dashboard'],
  ])('%p → %p', (input, out) => expect(safeNextPath(input)).toBe(out));
});
