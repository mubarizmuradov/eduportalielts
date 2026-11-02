/**
 * Typed-answer rules (completion, short answer, labelling).
 *
 * IELTS marking: answers are case-insensitive, spelling must be correct, and
 * an answer that breaks the word limit is wrong even when it contains the key.
 * Hyphenated words count as one word; a number written in digits counts as a
 * number, not a word. Pure functions, unit tested in answer-text.spec.ts.
 */
import type { WordLimit } from './package.schema';

const NUMBER_WORDS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'];

/** "NO MORE THAN TWO WORDS AND/OR A NUMBER", "ONE WORD ONLY", "A NUMBER" … */
export function wordLimitPhrase(w: WordLimit): string {
  if (w.maxWords === 0) return 'A NUMBER';
  const n = NUMBER_WORDS[w.maxWords - 1];
  const words = w.maxWords === 1 ? 'WORD' : 'WORDS';
  if (w.maxWords === 1) return w.allowNumber ? 'ONE WORD AND/OR A NUMBER' : 'ONE WORD ONLY';
  return `NO MORE THAN ${n} ${words}${w.allowNumber ? ' AND/OR A NUMBER' : ''}`;
}

/**
 * Canonical form used for comparison:
 * lower case, curly quotes → straight, dashes → "-", spaces collapsed,
 * trailing full stop removed, thousands separators dropped (1,000 → 1000),
 * times unified (7:30 → 7.30), currency symbols dropped (£50 → 50).
 */
export function normalizeAnswer(raw: string): string {
  return raw
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/[£$€₼]/g, '')
    .replace(/(\d),(?=\d{3}\b)/g, '$1')
    .replace(/(\d):(\d)/g, '$1.$2')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?;,]+$/, '')
    .trim();
}

/**
 * Expands optional words in round brackets:
 *   "(the) old library" → ["the old library", "old library"]
 * At most 4 optional parts (16 variants) per accepted answer.
 */
export function expandAccepted(answer: string): string[] {
  const parts = answer.split(/(\([^()]*\))/).filter((p) => p !== '');
  const optional = parts.filter((p) => p.startsWith('('));
  if (optional.length === 0) return [normalizeAnswer(answer)];
  if (optional.length > 4) throw new Error(`too many optional parts in "${answer}"`);
  const out = new Set<string>();
  for (let mask = 0; mask < 1 << optional.length; mask++) {
    let i = 0;
    const s = parts
      .map((p) => {
        if (!p.startsWith('(')) return p;
        return mask & (1 << i++) ? p.slice(1, -1) : ' ';
      })
      .join('');
    const n = normalizeAnswer(s);
    if (n) out.add(n);
  }
  return [...out];
}

const NUMBER_TOKEN = /^\d[\d.,/:]*(st|nd|rd|th|%|am|pm|kg|km|m|cm|mm|g|ml|l)?$/;
const NUMBER_SUFFIX = /^(am|pm|a\.m|p\.m|%)$/;

/** Counts words and numbers of an answer the way the IELTS word limit does. */
export function countWords(raw: string): { words: number; numbers: number } {
  const tokens = normalizeAnswer(raw).split(' ').filter(Boolean);
  let words = 0;
  let numbers = 0;
  tokens.forEach((t, i) => {
    if (NUMBER_TOKEN.test(t)) numbers++;
    // "7.30 pm": the am/pm belongs to the number before it.
    else if (NUMBER_SUFFIX.test(t) && i > 0 && NUMBER_TOKEN.test(tokens[i - 1])) return;
    else words++;
  });
  return { words, numbers };
}

export function withinWordLimit(raw: string, limit: WordLimit): boolean {
  const { words, numbers } = countWords(raw);
  if (words + numbers === 0) return false;
  if (!limit.allowNumber) return words + numbers <= limit.maxWords;
  return words <= limit.maxWords && numbers <= 1;
}

/** Marks one typed answer. */
export function isTextAnswerCorrect(response: string, accepted: string[], limit: WordLimit): boolean {
  if (!response || !withinWordLimit(response, limit)) return false;
  const r = normalizeAnswer(response);
  return accepted.some((a) => expandAccepted(a).includes(r));
}
