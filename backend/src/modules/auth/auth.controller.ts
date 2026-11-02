import { Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { Env } from '../../config/env';
import { staffAcademyIds } from '../identity/access.policy';
import { EduportalIdentityReader } from '../identity/eduportal-identity.reader';
import type { EduUser } from '../identity/identity.types';
import { SESSION_COOKIE } from './auth.cookies';
import { CurrentAuth, CurrentUser, Public } from './auth.guard';
import { AuthService } from './auth.service';
import type { AuthContext } from './auth.types';

/** Signing in happens only through EduPortal SSO (sso/sso.controller.ts). */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly identity: EduportalIdentityReader,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Post('logout')
  @HttpCode(200)
  async logout(@CurrentAuth() ctx: AuthContext | undefined, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(ctx);
    const secure =
      this.config.get('COOKIE_SECURE', { infer: true }) || this.config.get('NODE_ENV', { infer: true }) === 'production';
    res.clearCookie(SESSION_COOKIE, { path: '/', httpOnly: true, secure, sameSite: 'lax' });
    return { ok: true };
  }

  @Get('me')
  async me(@CurrentUser() user: EduUser) {
    const memberships = await this.identity.getMembershipTree(user.id);
    return {
      user,
      memberships,
      staffAcademyIds: user.isSystemAdmin
        ? memberships.academies.map((a) => a.academyId)
        : staffAcademyIds(memberships),
    };
  }
}
