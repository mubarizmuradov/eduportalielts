import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import type { Env } from '../../../config/env';
import { IeltsPrisma } from '../../../prisma/ielts-prisma.service';
import { EduportalIdentityReader } from '../../identity/eduportal-identity.reader';
import { AuthService } from '../auth.service';
import { safeEqual, safeNextPath, SsoAssertionError, verifySsoAssertion } from './sso-assertion';

/** Short-lived cookie that binds the flow to the browser that started it. */
export const SSO_STATE_COOKIE = 'ei_sso_state';
export const SSO_STATE_TTL_SEC = 10 * 60;

export type SsoFailure =
  | 'SSO_DENIED'
  | 'SSO_INVALID_TOKEN'
  | 'SSO_STATE_MISMATCH'
  | 'SSO_REPLAYED'
  | 'SSO_SESSION_ENDED';

export class SsoFlowError extends Error {
  constructor(
    readonly code: SsoFailure,
    readonly next: string,
    message: string,
  ) {
    super(message);
  }
}

interface StatePayload {
  typ: 'eduielts-sso-state';
  state: string;
  next: string;
}

@Injectable()
export class SsoService {
  private readonly log = new Logger(SsoService.name);
  private lastCleanup = 0;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly jwt: JwtService,
    private readonly db: IeltsPrisma,
    private readonly identity: EduportalIdentityReader,
    private readonly auth: AuthService,
  ) {}

  /** The exact callback URL registered at EduPortal for this client. */
  get redirectUri(): string {
    const origin = new URL(this.config.get('PUBLIC_URL', { infer: true })).origin;
    return `${origin}${this.config.get('PUBLIC_API_PREFIX', { infer: true })}/auth/sso/callback`;
  }

  /** Step 1: build the EduPortal URL and the signed state cookie. */
  async start(nextRaw: unknown): Promise<{ location: string; stateCookie: string }> {
    const next = safeNextPath(nextRaw);
    const state = randomBytes(32).toString('base64url');
    const stateCookie = await this.jwt.signAsync({ typ: 'eduielts-sso-state', state, next } satisfies StatePayload, {
      secret: this.config.get('IELTS_JWT_SECRET', { infer: true }),
      expiresIn: SSO_STATE_TTL_SEC,
    });
    const url = new URL(this.config.get('EDUPORTAL_SSO_AUTHORIZE_URL', { infer: true }));
    url.searchParams.set('client_id', this.config.get('EDUPORTAL_SSO_CLIENT_ID', { infer: true }));
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('state', state);
    return { location: url.toString(), stateCookie };
  }

  /** Step 2: EduPortal sent the browser back with a signed assertion. */
  async complete(input: {
    stateCookie: string | undefined;
    state: unknown;
    token: unknown;
    error: unknown;
    userAgent?: string;
  }): Promise<{ sessionToken: string; next: string }> {
    const saved = await this.readState(input.stateCookie);
    const next = saved?.next ?? '/dashboard';
    if (!saved || typeof input.state !== 'string' || !safeEqual(input.state, saved.state)) {
      throw new SsoFlowError('SSO_STATE_MISMATCH', next, 'state does not match this browser');
    }
    if (input.error !== undefined && input.error !== '') {
      throw new SsoFlowError('SSO_DENIED', next, `EduPortal returned error: ${String(input.error).slice(0, 64)}`);
    }
    if (typeof input.token !== 'string' || input.token.length > 8192) {
      throw new SsoFlowError('SSO_INVALID_TOKEN', next, 'token missing');
    }

    let assertion;
    try {
      assertion = verifySsoAssertion(input.token, {
        publicKey: this.config.get('EDUPORTAL_SSO_PUBLIC_KEY', { infer: true }),
        issuer: this.config.get('EDUPORTAL_SSO_ISSUER', { infer: true }),
        audience: this.config.get('EDUPORTAL_SSO_CLIENT_ID', { infer: true }),
        expectedNonce: saved.state,
      });
    } catch (e) {
      if (e instanceof SsoAssertionError) {
        this.log.warn(`Rejected SSO assertion: ${e.message}`);
        throw new SsoFlowError(e.code, next, e.message);
      }
      throw e;
    }

    // Single use: the primary key rejects a second redemption of the same jti.
    try {
      await this.db.ssoAssertion.create({ data: { jti: assertion.jti, expiresAt: assertion.expiresAt } });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') {
        throw new SsoFlowError('SSO_REPLAYED', next, 'assertion already used');
      }
      throw e;
    }
    void this.cleanupExpired();

    const sessionOk = await this.identity.isEduportalSessionValid(assertion.eduportalSessionId, assertion.userId);
    const user = sessionOk ? await this.identity.findActiveUser(assertion.userId) : null;
    if (!user) throw new SsoFlowError('SSO_SESSION_ENDED', next, 'EduPortal session or user is not active');

    const sessionToken = await this.auth.createSession(user.id, assertion.eduportalSessionId, input.userAgent);
    return { sessionToken, next };
  }

  private async readState(cookie: string | undefined): Promise<StatePayload | null> {
    if (!cookie) return null;
    try {
      const p = await this.jwt.verifyAsync<StatePayload>(cookie, {
        secret: this.config.get('IELTS_JWT_SECRET', { infer: true }),
      });
      return p.typ === 'eduielts-sso-state' && typeof p.state === 'string' ? { ...p, next: safeNextPath(p.next) } : null;
    } catch {
      return null;
    }
  }

  private async cleanupExpired() {
    if (Date.now() - this.lastCleanup < 10 * 60_000) return;
    this.lastCleanup = Date.now();
    await this.db.ssoAssertion
      .deleteMany({ where: { expiresAt: { lt: new Date() } } })
      .catch((e: Error) => this.log.warn(`SSO cleanup failed: ${e.message}`));
  }
}
