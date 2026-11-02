import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import type { AuthContext } from './auth.types';

export const PUBLIC_ROUTE = 'eduielts:public';
/** Route works without login; `req.auth` is filled when a session exists. */
export const Public = () => SetMetadata(PUBLIC_ROUTE, true);

/** Global guard: every route needs a session unless marked @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    if (context.getType() !== 'http') return true;
    const req = context.switchToHttp().getRequest<Request>();
    const ctx = await this.auth.resolve(req.cookies ?? {});
    if (ctx) req.auth = ctx;
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!ctx && !isPublic) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Sign in required' });
    }
    return true;
  }
}

export const CurrentAuth = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthContext | undefined =>
    ctx.switchToHttp().getRequest<Request>().auth,
);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const auth = ctx.switchToHttp().getRequest<Request>().auth;
  if (!auth) throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Sign in required' });
  return auth.user;
});
