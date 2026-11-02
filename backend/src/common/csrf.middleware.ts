import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Cookie based auth + custom header check. Browsers cannot send a custom
 * header cross-site without a CORS preflight, and CORS only allows CORS_ORIGIN,
 * so requiring it on every mutating request blocks CSRF.
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    if (!SAFE.has(req.method) && req.headers['x-eduielts-request'] !== '1') {
      throw new ForbiddenException({ code: 'CSRF', message: 'Missing x-eduielts-request header' });
    }
    next();
  }
}
