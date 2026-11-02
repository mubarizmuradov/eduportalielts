import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { Env } from '../../../config/env';
import { SESSION_COOKIE } from '../auth.cookies';
import { Public } from '../auth.guard';
import { AuthService } from '../auth.service';
import { SSO_STATE_COOKIE, SSO_STATE_TTL_SEC, SsoFlowError, SsoService } from './sso.service';

type CallbackParams = { token?: unknown; state?: unknown; error?: unknown };

/**
 * EduPortal single sign-on (docs/EDUPORTAL_SSO.md).
 *   GET  /auth/sso/start?next=/dashboard   → 302 to EduPortal
 *   POST /auth/sso/callback (form: token, state)  ← EduPortal auto-submits
 *   GET  /auth/sso/callback?token=&state=  (fallback; also ?error=)
 * Both end with a 303 redirect to a frontend page, never JSON.
 */
@Controller('auth/sso')
export class SsoController {
  constructor(
    private readonly sso: SsoService,
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private get secure() {
    return (
      this.config.get('COOKIE_SECURE', { infer: true }) || this.config.get('NODE_ENV', { infer: true }) === 'production'
    );
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('start')
  async start(@Query('next') next: unknown, @Res() res: Response) {
    const { location, stateCookie } = await this.sso.start(next);
    res.cookie(SSO_STATE_COOKIE, stateCookie, {
      httpOnly: true,
      secure: this.secure,
      // EduPortal posts the callback form from another origin. On a sibling
      // subdomain Lax would do, "none" also covers a fully different domain.
      sameSite: this.secure ? 'none' : 'lax',
      maxAge: SSO_STATE_TTL_SEC * 1000,
      path: '/',
    });
    res.setHeader('Cache-Control', 'no-store');
    res.redirect(302, location);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('callback')
  callbackPost(@Body() body: CallbackParams, @Req() req: Request, @Res() res: Response) {
    return this.callback(body ?? {}, req, res);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('callback')
  callbackGet(@Query() query: CallbackParams, @Req() req: Request, @Res() res: Response) {
    return this.callback(query, req, res);
  }

  private async callback(params: CallbackParams, req: Request, res: Response) {
    res.clearCookie(SSO_STATE_COOKIE, { path: '/', secure: this.secure, sameSite: this.secure ? 'none' : 'lax' });
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    try {
      const { sessionToken, next } = await this.sso.complete({
        stateCookie: req.cookies?.[SSO_STATE_COOKIE] as string | undefined,
        state: params.state,
        token: params.token,
        error: params.error,
        userAgent: req.headers['user-agent'],
      });
      res.cookie(SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        secure: this.secure,
        sameSite: 'lax',
        maxAge: this.auth.sessionTtlMs,
        path: '/',
      });
      res.redirect(303, next);
    } catch (e) {
      this.fail(res, e);
    }
  }

  private fail(res: Response, e: unknown) {
    if (!(e instanceof SsoFlowError)) throw e;
    const q = new URLSearchParams({ error: e.code });
    if (e.next !== '/dashboard') q.set('next', e.next);
    res.redirect(303, `/login?${q.toString()}`);
  }
}
