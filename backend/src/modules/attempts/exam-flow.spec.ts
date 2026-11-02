import { buildIeltsExam } from '../../ielts-format/build-exam';
import { candidateNumber, cleanResponses, deadlineFor, isPastGrace, moduleSeconds, nextModule, speakingSlots } from './exam-flow';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { makeSamplePackage } = require('../../../samples/sample-package.js');

describe('exam flow', () => {
  const r = buildIeltsExam(makeSamplePackage());
  if (!r.ok) throw new Error('sample invalid');
  const exam = r.exam.candidate;

  it('runs the modules in IELTS order', () => {
    expect(nextModule('LISTENING')).toBe('READING');
    expect(nextModule('READING')).toBe('WRITING');
    expect(nextModule('WRITING')).toBe('SPEAKING');
    expect(nextModule('SPEAKING')).toBeNull();
  });

  it('times Listening by its recordings plus 2 minutes review', () => {
    expect(moduleSeconds(exam, 'LISTENING')).toBe(4 * 20 + 120);
    expect(moduleSeconds(exam, 'READING')).toBe(3600);
    expect(moduleSeconds(exam, 'WRITING')).toBe(3600);
    expect(moduleSeconds(exam, 'SPEAKING')).toBeGreaterThan(14 * 60);
    const start = new Date('2026-01-01T10:00:00Z');
    expect(deadlineFor(exam, 'READING', start).toISOString()).toBe('2026-01-01T11:00:00.000Z');
  });

  it('counts speaking recording slots', () => {
    expect(speakingSlots(exam)).toEqual({ 1: 9, 2: 2, 3: 5 });
  });

  it('accepts late saves only within the grace period', () => {
    const now = new Date('2026-01-01T10:00:40Z');
    expect(isPastGrace(new Date('2026-01-01T10:00:20Z'), now)).toBe(false);
    expect(isPastGrace(new Date('2026-01-01T10:00:05Z'), now)).toBe(true);
    expect(isPastGrace(null, now)).toBe(false);
  });

  it('keeps only real question numbers and short strings', () => {
    expect(cleanResponses({ 1: 'a', 40: 'b', 0: 'x', 41: 'y', abc: 'z', 5: 7, 6: '  ', 7: 'q'.repeat(300) })).toEqual({
      1: 'a',
      40: 'b',
      7: 'q'.repeat(100),
    });
    expect(candidateNumber('3f1c0a7e-0000-4000-8000-000000000001')).toMatch(/^\d{6}$/);
  });
});
