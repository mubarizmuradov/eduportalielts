/**
 * EduPortal SSO login assertion (docs/EDUPORTAL_SSO.md).
 *
 * EduPortal signs a short-lived JWT with its PRIVATE key; EduPortal IELTS only holds
 * the PUBLIC key, so a compromised EduPortal IELTS server can not mint EduPortal logins.
 * Pure functions, no I/O, so the rules are unit tested in isolation.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';

export const SSO_ALGORITHMS: jwt.Algorithm[] = ['ES256', 'RS256'];
/** Assertions are meant to be redeemed within seconds. */
export const SSO_MAX_LIFETIME_SEC = 120;
const CLOCK_TOLERANCE_SEC = 10;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SsoAssertion {
  /** EduPortal users.id */
  userId: string;
  /** EduPortal sessions.id of the browser that logged in */
  eduportalSessionId: string;
  /** unique id, redeemable once */
  jti: string;
  expiresAt: Date;
}

export type SsoErrorCode = 'SSO_INVALID_TOKEN' | 'SSO_STATE_MISMATCH';

export class SsoAssertionError extends Error {
  constructor(
    readonly code: SsoErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface VerifyOptions {
  publicKey: string;
  issuer: string;
  /** our client_id */
  audience: string;
  /** state we put into the browser cookie when the flow started */
  expectedNonce: string;
  now?: Date;
}

export function safeEqual(a: string, b: string): boolean {
  // Hash first so lengths always match and nothing leaks through timing.
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function verifySsoAssertion(token: string, opts: VerifyOptions): SsoAssertion {
  const nowSec = Math.floor((opts.now ?? new Date()).getTime() / 1000);
  let payload: jwt.JwtPayload;
  try {
    const decoded = jwt.verify(token, opts.publicKey, {
      // Never let the token choose the algorithm (blocks "none" and HS/RS key confusion).
      algorithms: SSO_ALGORITHMS,
      issuer: opts.issuer,
      audience: opts.audience,
      clockTolerance: CLOCK_TOLERANCE_SEC,
      clockTimestamp: nowSec,
      maxAge: SSO_MAX_LIFETIME_SEC,
    });
    if (typeof decoded === 'string') throw new Error('payload must be an object');
    payload = decoded;
  } catch (e) {
    throw new SsoAssertionError('SSO_INVALID_TOKEN', (e as Error).message);
  }

  const { sub, sid, jti, nonce, iat, exp } = payload as jwt.JwtPayload & { sid?: unknown; nonce?: unknown };
  if (typeof sub !== 'string' || !UUID.test(sub)) throw new SsoAssertionError('SSO_INVALID_TOKEN', 'bad sub');
  if (typeof sid !== 'string' || sid.length < 8 || sid.length > 128)
    throw new SsoAssertionError('SSO_INVALID_TOKEN', 'bad sid');
  if (typeof jti !== 'string' || jti.length < 16 || jti.length > 128)
    throw new SsoAssertionError('SSO_INVALID_TOKEN', 'bad jti');
  if (typeof iat !== 'number' || typeof exp !== 'number')
    throw new SsoAssertionError('SSO_INVALID_TOKEN', 'iat and exp are required');
  if (exp - iat > SSO_MAX_LIFETIME_SEC)
    throw new SsoAssertionError('SSO_INVALID_TOKEN', 'assertion lifetime too long');
  if (typeof nonce !== 'string' || !safeEqual(nonce, opts.expectedNonce))
    throw new SsoAssertionError('SSO_STATE_MISMATCH', 'nonce does not match this browser');

  return { userId: sub, eduportalSessionId: sid, jti, expiresAt: new Date((exp + CLOCK_TOLERANCE_SEC) * 1000) };
}

/** Only same-site relative paths may be used as the post-login destination. */
export function safeNextPath(value: unknown, fallback = '/dashboard'): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 512) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  if (value.startsWith('/api/')) return fallback;
  return value;
}
