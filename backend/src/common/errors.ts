import { HttpException, HttpStatus } from '@nestjs/common';

/** Domain error with a stable machine readable code for the frontend. */
export class AppError extends HttpException {
  constructor(status: HttpStatus, code: string, message: string, details?: Record<string, unknown>) {
    super({ code, message, ...details }, status);
  }
}

export const notFound = (what: string) => new AppError(HttpStatus.NOT_FOUND, 'NOT_FOUND', `${what} not found`);
export const forbidden = (message = 'You are not allowed to do this') =>
  new AppError(HttpStatus.FORBIDDEN, 'FORBIDDEN', message);
export const conflict = (code: string, message: string) => new AppError(HttpStatus.CONFLICT, code, message);
