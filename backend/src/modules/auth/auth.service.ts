import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Env } from '../../config/env';
import { IeltsPrisma } from '../../prisma/ielts-prisma.service';
import { EduportalIdentityReader } from '../identity/eduportal-identity.reader';
import type { AuthContext } from './auth.types';
import { SESSION_COOKIE } from './auth.cookies';

interface SessionTokenPayload {
  sub: string;
  sid: string;
  typ: 'eduielts';
}

/**
 * EduPortal IELTS sessions. The ONLY way to get one is EduPortal single sign-on
 * (sso/sso.service.ts): EduPortal IELTS never sees passwords.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly jwt: JwtService,
    private readonly db: IeltsPrisma,
    private readonly identity: EduportalIdentityReader,
  ) {}

  get sessionTtlMs() {
    return this.config.get('SESSION_TTL_HOURS', { infer: true }) * 3600_000;
  }

  /** Creates an EduPortal IELTS session bound to an EduPortal session; returns the cookie value. */
  async createSession(userId: string, eduportalSessionId: string, userAgent?: string) {
    const session = await this.db.authSession.create({
      data: {
        userId,
        eduportalSessionId,
        userAgent: userAgent?.slice(0, 300),
        expiresAt: new Date(Date.now() + this.sessionTtlMs),
      },
    });
    return this.jwt.signAsync({ sub: userId, sid: session.id, typ: 'eduielts' } satisfies SessionTokenPayload, {
      secret: this.config.get('IELTS_JWT_SECRET', { infer: true }),
      expiresIn: Math.floor(this.sessionTtlMs / 1000),
    });
  }

  async logout(ctx: AuthContext | undefined) {
    if (!ctx) return;
    await this.db.authSession.updateMany({
      where: { id: ctx.sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Resolves the caller from the EduPortal IELTS session cookie. Returns null when anonymous. */
  async resolve(cookies: Record<string, string | undefined>): Promise<AuthContext | null> {
    const token = cookies[SESSION_COOKIE];
    if (!token) return null;
    let payload: SessionTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<SessionTokenPayload>(token, {
        secret: this.config.get('IELTS_JWT_SECRET', { infer: true }),
      });
    } catch {
      return null;
    }
    if (payload.typ !== 'eduielts') return null;
    const session = await this.db.authSession.findFirst({
      where: { id: payload.sid, userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, eduportalSessionId: true },
    });
    if (!session) return null;
    // The session lives only as long as the EduPortal session it came from
    // (EduPortal logout / "end other sessions" deletes that row).
    if (!(await this.identity.isEduportalSessionValid(session.eduportalSessionId, payload.sub))) {
      await this.db.authSession.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return null;
    }
    const user = await this.identity.findActiveUser(payload.sub);
    return user ? { user, sessionId: session.id } : null;
  }
}
