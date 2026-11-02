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

export function markModule(key: AnswerKey, responses: Responses): ModuleMark {
  const correct: Record<number, boolean> = {};
  const doneMulti = new Set<string>();
  for (const [nStr, entry] of Object.entries(key)) {
    const n = Number(nStr);
    if (entry.kind === 'choice') {
      correct[n] = (responses[n] ?? '').trim().toUpperCase() === entry.answer.toUpperCase();
    } else if (entry.kind === 'text') {
      correct[n] = isTextAnswerCorrect(responses[n] ?? '', entry.answers, entry.wordLimit);
    } else {
      // "Choose TWO letters": each correct letter earns one mark, in either order.
      const id = entry.numbers.join(',');
      if (doneMulti.has(id)) continue;
      doneMulti.add(id);
      const chosen = new Set(entry.numbers.map((m) => (responses[m] ?? '').trim().toUpperCase()).filter(Boolean));
      const hits = [...chosen].filter((c) => entry.answers.includes(c)).length;
      entry.numbers.forEach((m, i) => (correct[m] = i < hits));
    }
  }
  return { raw: Object.values(correct).filter(Boolean).length, correct };
}
