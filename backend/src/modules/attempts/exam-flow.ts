/**
 * The order and timing of a sitting, like the real test: Listening → Reading
 * → Writing (one sitting, no breaks), then Speaking. Time limits are enforced
 * by the server; the browser only displays them. Pure, unit tested.
 */
import type { CandidateExam, Module } from '../../ielts-format/exam.types';

export type DbModule = 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';
export const DB_ORDER: DbModule[] = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'];
export const toModule = (m: DbModule) => m.toLowerCase() as Module;
export const toDbModule = (m: Module) => m.toUpperCase() as DbModule;

/** Late answers (network delay) are still accepted for this long after the deadline. */
export const GRACE_SECONDS = 30;
/** Extra time per spoken question for the examiner prompt and the upload. */
const SPEAKING_OVERHEAD_PER_ANSWER = 25;
const SPEAKING_BUFFER_SECONDS = 10 * 60;

export type SpeakingMode = 'RECORDED' | 'FACE_TO_FACE';

/** Face-to-face Speaking is taken with the teacher: the online sitting ends after Writing. */
export function nextModule(m: DbModule, speaking: SpeakingMode = 'RECORDED'): DbModule | null {
  const next = DB_ORDER[DB_ORDER.indexOf(m) + 1] ?? null;
  return next === 'SPEAKING' && speaking === 'FACE_TO_FACE' ? null : next;
}

/** Whole online sitting in seconds (Speaking only when it is recorded online). */
export function sittingSeconds(exam: CandidateExam, speaking: SpeakingMode = 'RECORDED'): number {
  return DB_ORDER.filter((m) => m !== 'SPEAKING' || speaking === 'RECORDED').reduce((s, m) => s + moduleSeconds(exam, m), 0);
}

/** Recording slots of the Speaking test: part → number of answers. */
export function speakingSlots(exam: CandidateExam): Record<1 | 2 | 3, number> {
  return {
    1: exam.speaking.part1.topics.reduce((n, t) => n + t.questions.length, 0),
    2: 1 + exam.speaking.part2.roundingOff.length,
    3: exam.speaking.part3.themes.reduce((n, t) => n + t.questions.length, 0),
  };
}

export function moduleSeconds(exam: CandidateExam, m: DbModule): number {
  switch (m) {
    case 'LISTENING':
      return Math.ceil(exam.listening.parts.reduce((s, p) => s + p.audioSeconds, 0)) + exam.listening.reviewSeconds;
    case 'READING':
      return exam.reading.minutes * 60;
    case 'WRITING':
      return exam.writing.minutes * 60;
    case 'SPEAKING': {
      const slots = speakingSlots(exam);
      const sp = exam.speaking;
      const talk =
        slots[1] * sp.part1.answerSeconds +
        sp.part2.prepSeconds +
        sp.part2.talkSeconds +
        sp.part2.roundingOff.length * sp.part2.roundingOffSeconds +
        slots[3] * sp.part3.answerSeconds;
      return talk + (slots[1] + slots[2] + slots[3]) * SPEAKING_OVERHEAD_PER_ANSWER + SPEAKING_BUFFER_SECONDS;
    }
  }
}

export function deadlineFor(exam: CandidateExam, m: DbModule, start: Date): Date {
  return new Date(start.getTime() + moduleSeconds(exam, m) * 1000);
}

export function isPastGrace(deadline: Date | null, now = new Date()): boolean {
  return !!deadline && now.getTime() > deadline.getTime() + GRACE_SECONDS * 1000;
}

/** Short stable "candidate number" shown in the exam header, e.g. 482915. */
export function candidateNumber(attemptId: string): string {
  let h = 0;
  for (const ch of attemptId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return String(100000 + (h % 900000));
}

/** Only answers for real question numbers, as short strings. */
export function cleanResponses(input: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (!/^([1-9]|[1-3]\d|40)$/.test(k) || typeof v !== 'string') continue;
    const s = v.slice(0, 100);
    if (s.trim() !== '') out[k] = s;
  }
  return out;
}
