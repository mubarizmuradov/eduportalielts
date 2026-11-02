import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

/** Validates untrusted input and throws a 400 with a readable issue list. */
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new BadRequestException({
      code: 'VALIDATION_FAILED',
      message: 'Request validation failed',
      issues: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  return result.data;
}

export const uuid = z.string().uuid();
