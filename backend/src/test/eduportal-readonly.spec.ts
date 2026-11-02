import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Guard rail: EduPortal IELTS must never write to the EduPortal database. */
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') && !p.endsWith('.spec.ts') ? [p] : [];
  });
}

describe('EduPortal database is read-only', () => {
  const files = walk(join(__dirname, '..'));
  it('only identity readers and health checks use the EduPortal client', () => {
    const users = files.filter((f) => readFileSync(f, 'utf8').includes('EduportalPrisma')).map((f) => f.replace(/\\/g, '/'));
    expect(users.every((f) => /prisma\/|identity\/eduportal-identity\.reader\.ts$|health\/health\.controller\.ts$/.test(f))).toBe(true);
  });
  it('the reader performs no write operations or raw SQL', () => {
    const src = readFileSync(join(__dirname, '../modules/identity/eduportal-identity.reader.ts'), 'utf8');
    expect(src).not.toMatch(/\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\(/);
    expect(src).not.toMatch(/\$(executeRaw|executeRawUnsafe|queryRawUnsafe|transaction)/);
  });
});
