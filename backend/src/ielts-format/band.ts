/**
 * IELTS band scores.
 *
 * Listening and Reading: raw score (0-40) → band, using the conversion tables
 * published for IELTS preparation (Academic and General Training Reading use
 * different tables). Real test versions are equated individually, so a mock
 * band is an estimate; the tables live here so a school can tune them.
 *
 * Writing and Speaking: examiners give each criterion a whole band 0-9.
 * Overall band: mean of the four skills rounded to the nearest half band;
 * .25 rounds up to .5 and .75 rounds up to the next whole band.
 */

type Row = [minRaw: number, band: number];

export const LISTENING_TABLE: Row[] = [
  [39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5],
  [16, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [3, 2], [2, 1.5], [1, 1],
];

export const ACADEMIC_READING_TABLE: Row[] = [
  [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5],
  [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [3, 2], [2, 1.5], [1, 1],
];

export const GENERAL_READING_TABLE: Row[] = [
  [40, 9], [39, 8.5], [37, 8], [36, 7.5], [34, 7], [32, 6.5], [30, 6], [27, 5.5],
  [23, 5], [19, 4.5], [15, 4], [12, 3.5], [9, 3], [6, 2.5], [4, 2], [2, 1.5], [1, 1],
];

function fromTable(table: Row[], raw: number): number {
  if (!Number.isInteger(raw) || raw < 0 || raw > 40) throw new RangeError(`raw score must be 0-40, got ${raw}`);
  for (const [min, band] of table) if (raw >= min) return band;
  return 0;
}

export function listeningBand(raw: number) {
  return fromTable(LISTENING_TABLE, raw);
}

export function readingBand(raw: number, testType: 'academic' | 'general_training') {
  return fromTable(testType === 'academic' ? ACADEMIC_READING_TABLE : GENERAL_READING_TABLE, raw);
}

/** Nearest half band, halves of halves rounding up (6.25 → 6.5, 6.75 → 7, 6.125 → 6). */
export function roundToHalfBand(value: number): number {
  return Math.floor(value * 2 + 0.5) / 2;
}

export function overallBand(bands: { listening: number; reading: number; writing: number; speaking: number }) {
  return roundToHalfBand((bands.listening + bands.reading + bands.writing + bands.speaking) / 4);
}

export interface WritingCriteria {
  /** Task Achievement (Task 1) / Task Response (Task 2) */
  ta: number;
  /** Coherence and Cohesion */
  cc: number;
  /** Lexical Resource */
  lr: number;
  /** Grammatical Range and Accuracy */
  gra: number;
}

export interface SpeakingCriteria {
  /** Fluency and Coherence */
  fc: number;
  lr: number;
  gra: number;
  /** Pronunciation */
  p: number;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Task 2 counts twice as much as Task 1. */
export function writingBand(task1: WritingCriteria, task2: WritingCriteria): number {
  const t1 = mean([task1.ta, task1.cc, task1.lr, task1.gra]);
  const t2 = mean([task2.ta, task2.cc, task2.lr, task2.gra]);
  return roundToHalfBand((t1 + 2 * t2) / 3);
}

export function speakingBand(c: SpeakingCriteria): number {
  return roundToHalfBand(mean([c.fc, c.lr, c.gra, c.p]));
}
