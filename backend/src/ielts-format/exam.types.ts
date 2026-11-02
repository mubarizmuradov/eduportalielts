/**
 * What buildIeltsExam() produces. The candidate view never contains answers
 * or transcripts; the answer key and the staff review stay on the server.
 * frontend/lib/exam-types.ts mirrors the candidate types.
 */
import type { WordLimitLike } from './answer-text';
import type { IeltsPackage, QuestionType } from './package.schema';

export type Module = 'listening' | 'reading' | 'writing' | 'speaking';
export const MODULE_ORDER: Module[] = ['listening', 'reading', 'writing', 'speaking'];

/** A question group as the candidate sees it: every `answer`/`answers` removed. */
export type CandidateGroup = {
  type: QuestionType;
  /** First and last question number, e.g. [1, 5] → "Questions 1–5". */
  range: [number, number];
  numbers: number[];
  instructions: string;
  title?: string;
  example?: string;
  /** Type-specific fields (options, statements, lines, table, image…). */
  [field: string]: unknown;
};

export interface CandidateListeningPart {
  partNumber: number;
  audio: string;
  audioSeconds: number;
  /** "Listen and answer questions 1–10." */
  intro: string;
  questionGroups: CandidateGroup[];
}

export interface CandidateReadingText {
  label?: string;
  title: string;
  subtitle?: string;
  paragraphs: Array<{ label?: string; text: string }>;
  image?: string;
  imageCaption?: string;
  glossary?: Array<{ term: string; definition: string }>;
}

export interface CandidateReadingSection {
  sectionNumber: number;
  /** "You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1 below." */
  intro: string;
  texts: CandidateReadingText[];
  questionGroups: CandidateGroup[];
}

export interface CandidateWritingTask {
  taskNumber: 1 | 2;
  minutes: number;
  minWords: number;
  /** Full task text, paragraphs separated by blank lines (standard IELTS wording included). */
  body: string;
  /** First visual (kept for tests built before 1.1) … */
  image?: string;
  /** … all visuals of Academic Task 1, shown together. */
  images?: string[];
  /** GT letter bullet points (shown as a list inside the body area). */
  bulletPoints?: string[];
}

export interface CandidateSpokenQuestion {
  text: string;
  audio?: string;
}

export interface CandidateSpeaking {
  part1: { topics: Array<{ topic: string; questions: CandidateSpokenQuestion[] }>; answerSeconds: number };
  part2: {
    topic: string;
    bulletPoints: string[];
    finalPrompt: string;
    introAudio?: string;
    prepSeconds: number;
    talkSeconds: number;
    roundingOff: CandidateSpokenQuestion[];
    roundingOffSeconds: number;
  };
  part3: { themes: Array<{ theme: string; questions: CandidateSpokenQuestion[] }>; answerSeconds: number };
}

export interface CandidateExam {
  testType: IeltsPackage['testType'];
  title: string;
  listening: { parts: CandidateListeningPart[]; reviewSeconds: number };
  reading: { sections: CandidateReadingSection[]; minutes: number };
  writing: { tasks: CandidateWritingTask[]; minutes: number };
  speaking: CandidateSpeaking;
}

/** Marking data for one question number (Listening / Reading). */
export type KeyEntry =
  | { kind: 'choice'; answer: string }
  | { kind: 'text'; answers: string[]; wordLimit: WordLimitLike }
  | { kind: 'multi'; numbers: number[]; answers: string[] }
  /** Several typed answers in any order ("Which TWO …?"); each unit scores once. */
  | { kind: 'textset'; numbers: number[]; units: string[][]; wordLimit: WordLimitLike };

export type AnswerKey = Record<number, KeyEntry>;

export interface ExamAnswerKey {
  listening: AnswerKey;
  reading: AnswerKey;
}

/** Shown to teachers only. */
export interface StaffReview {
  listening: Array<{ partNumber: number; context?: string; transcript: string }>;
  /** Human readable answer per question, e.g. "B", "TRUE", "library / the library". */
  answers: { listening: Record<number, string>; reading: Record<number, string> };
  /** Evidence for the answer, per question number (when the package gives it). */
  explanations?: { listening: Record<number, string>; reading: Record<number, string> };
  /** Marking notes from the package. */
  notes?: { writingTask1?: string; writingTask2?: string; speaking?: string };
  meta?: Record<string, unknown>;
}

export interface BuiltAsset {
  id: string;
  kind: 'audio' | 'image';
  mimeType: string;
  /** Decoded bytes for inline assets … */
  data?: Buffer;
  /** … or an https URL to download at import time. */
  url?: string;
  durationSeconds?: number;
  alt?: string;
}

export interface ExamSummary {
  testType: IeltsPackage['testType'];
  title: string;
  listening: { questions: number; types: Partial<Record<QuestionType, number>>; audioSeconds: number };
  reading: { questions: number; types: Partial<Record<QuestionType, number>>; texts: number; words: number };
  writing: { task1: string; task2: string };
  speaking: { part1Questions: number; part3Questions: number };
  assets: { audio: number; image: number; bytes: number };
}

export interface BuiltExam {
  schemaVersion: string;
  candidate: CandidateExam;
  answerKey: ExamAnswerKey;
  staff: StaffReview;
  assets: BuiltAsset[];
  summary: ExamSummary;
  warnings: BuildIssue[];
}

export interface BuildIssue {
  /** JSON path inside the package, e.g. "reading.sections.0.questionGroups.2.questions.1.answer" */
  path: string;
  message: string;
}

export type BuildResult = { ok: true; exam: BuiltExam } | { ok: false; errors: BuildIssue[]; warnings: BuildIssue[] };
