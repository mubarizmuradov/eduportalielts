import { z } from 'zod';

const boolFlag = (defaultValue: boolean) =>
  z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => (v === undefined ? defaultValue : v === 'true' || v === '1'));


export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4002),
  DATABASE_URL: z.string().min(1),
  EDUPORTAL_DATABASE_URL: z.string().min(1),
  IELTS_JWT_SECRET: z.string().min(32, 'IELTS_JWT_SECRET must be at least 32 characters'),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(12),
  CORS_ORIGIN: z.string().default('http://localhost:3200'),
  UPLOAD_DIR: z.string().default('./uploads'),
  /** Largest IELTS Test Package accepted by /tests/import (base64 audio included). */
  MAX_PACKAGE_MB: z.coerce.number().positive().max(500).default(120),
  /** Largest Speaking answer recording. */
  MAX_RECORDING_MB: z.coerce.number().positive().max(100).default(15),
  /**
   * Hosts that package assets given as https URLs may be downloaded from
   * (comma separated, e.g. "storage.googleapis.com,cdn.example.com").
   * Empty = URL assets are refused; send them inline as base64.
   */
  ASSET_FETCH_ALLOWED_HOSTS: z
    .string()
    .default('')
    .transform((v) => v.split(',').map((h) => h.trim().toLowerCase()).filter(Boolean)),
  COOKIE_SECURE: boolFlag(false),
  /** Public URL prefix of this API as seen by browsers (nginx: /api). */
  PUBLIC_API_PREFIX: z.string().default('/api'),
  /** Public origin of this site as browsers see it, e.g. https://ielts.eduportal.az */
  PUBLIC_URL: z.string().url('PUBLIC_URL is required (e.g. https://ielts.eduportal.az)'),

  // ---- EduPortal SSO: the only way to sign in (docs/EDUPORTAL_SSO.md) ----
  /** EduPortal page that issues login assertions, e.g. https://eduportal.az/az/sso/eduielts */
  EDUPORTAL_SSO_AUTHORIZE_URL: z.string().url('EDUPORTAL_SSO_AUTHORIZE_URL is required'),
  /** EduPortal's public key (PEM, ES256 or RS256). "\n" escapes are accepted. */
  EDUPORTAL_SSO_PUBLIC_KEY: z
    .string()
    .transform((v) => v.replace(/\\n/g, '\n').trim())
    .refine((v) => v.includes('PUBLIC KEY-----'), 'EDUPORTAL_SSO_PUBLIC_KEY must be a PEM public key'),
  EDUPORTAL_SSO_CLIENT_ID: z.string().min(1).default('eduielts'),
  EDUPORTAL_SSO_ISSUER: z.string().min(1).default('eduportal'),
}).superRefine((env, ctx) => {
  if (env.NODE_ENV === 'production' && !env.EDUPORTAL_SSO_AUTHORIZE_URL.startsWith('https://')) {
    ctx.addIssue({ code: 'custom', path: ['EDUPORTAL_SSO_AUTHORIZE_URL'], message: 'must be https in production' });
  }
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment:\n${issues}`);
  }
  return parsed.data;
}
