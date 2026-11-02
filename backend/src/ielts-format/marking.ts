/**
 * Automatic marking of Listening and Reading (1 mark per question, 40 marks).
 * Writing and Speaking are marked by teachers with the band descriptors.
 */
import { isTextAnswerCorrect } from './answer-text';
import type { AnswerKey } from './exam.types';

/** Candidate answers: question number → letter / TRUE / typed text. */
export type Responses = Record<string, string>;

export interface ModuleMark {
  raw: number;
  /** question number → correct? */
  correct: Record<number, boolean>;
}

/**
 * Largest number of answer units the typed answers can cover, each answer
 * and each unit used at most once (≤ 3 units, so trying every order is cheap).
 */
export function bestUnitMatch(answers: string[], units: string[][], ok: (answer: string, unit: string[]) => boolean): number {
  let best = 0;
  const used = new Array<boolean>(units.length).fill(false);
  const walk = (i: number, hits: number) => {
    if (hits + (answers.length - i) <= best) return;
    if (i === answers.length) {
      best = Math.max(best, hits);
      return;
    }
    walk(i + 1, hits);
    units.forEach((u, j) => {
      if (used[j] || !ok(answers[i], u)) return;
      used[j] = true;
      walk(i + 1, hits + 1);
      used[j] = false;
    });
  };
  walk(0, 0);
  return best;
}

export function markModule(key: AnswerKey, responses: Responses): ModuleMark {
  const correct: Record<number, boolean> = {};
  const done = new Set<string>();
  for (const [nStr, entry] of Object.entries(key)) {
    const n = Number(nStr);
    if (entry.kind === 'choice') {
      correct[n] = (responses[n] ?? '').trim().toUpperCase() === entry.answer.toUpperCase();
    } else if (entry.kind === 'text') {
      correct[n] = isTextAnswerCorrect(responses[n] ?? '', entry.answers, entry.wordLimit);
    } else if (entry.kind === 'multi') {
      // "Choose TWO letters": each correct letter earns one mark, in either order.
      const id = entry.numbers.join(',');
      if (done.has(id)) continue;
      done.add(id);
      const chosen = new Set(entry.numbers.map((m) => (responses[m] ?? '').trim().toUpperCase()).filter(Boolean));
      const hits = [...chosen].filter((c) => entry.answers.includes(c)).length;
      entry.numbers.forEach((m, i) => (correct[m] = i < hits));
    } else {
      // "Which TWO …? Write your answers in any order": one mark per unit found,
      // writing the same answer twice does not score twice.
      const id = entry.numbers.join(',');
      if (done.has(id)) continue;
      done.add(id);
      const answers = entry.numbers.map((m) => responses[m] ?? '').filter((r) => r.trim() !== '');
      const hits = bestUnitMatch(answers, entry.units, (r, unit) => isTextAnswerCorrect(r, unit, entry.wordLimit));
      entry.numbers.forEach((m, i) => (correct[m] = i < hits));
    }
  }
  return { raw: Object.values(correct).filter(Boolean).length, correct };
}
