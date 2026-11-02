import type { CandidateExam, Module, SpeakingContent, WritingTask } from './exam-types';

export interface EduUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  language: string;
  isSystemAdmin: boolean;
}

export interface Me {
  user: EduUser;
  memberships: {
    academies: { academyId: string; name: string; logoUrl: string | null; role: string }[];
    campuses: { campusId: string; academyId: string; name: string; role: string }[];
    classes: { classId: string; academyId: string; campusId: string; title: string; role: string }[];
  };
  staffAcademyIds: string[];
}

export type QuestionTypeCounts = Partial<Record<string, number>>;

export interface ExamSummary {
  testType: 'academic' | 'general_training';
  title: string;
  listening: { questions: number; types: QuestionTypeCounts; audioSeconds: number };
  reading: { questions: number; types: QuestionTypeCounts; texts: number; words: number };
  writing: { task1: string; task2: string };
  speaking: { part1Questions: number; part3Questions: number };
  assets: { audio: number; image: number; bytes: number };
}

export interface BuildIssue {
  path: string;
  message: string;
}

export interface TestListItem {
  id: string;
  academyId: string;
  title: string;
  testType: 'ACADEMIC' | 'GENERAL_TRAINING';
  summary: ExamSummary;
  createdAt: string;
  assignmentCount: number;
  createdBy: { firstName: string; lastName: string } | null;
}

export interface TestDetail {
  id: string;
  academyId: string;
  title: string;
  testType: 'ACADEMIC' | 'GENERAL_TRAINING';
  candidate: CandidateExam;
  staff: {
    listening: { partNumber: number; context?: string; transcript: string }[];
    answers: { listening: Record<string, string>; reading: Record<string, string> };
    meta?: Record<string, unknown>;
  };
  summary: ExamSummary;
  warnings: BuildIssue[];
  createdAt: string;
  assets: { key: string; kind: string; mimeType: string; sizeBytes: number; durationSeconds: number | null; alt: string | null }[];
}

export interface ClassOption {
  id: string;
  title: string;
  academyId: string;
  campusId: string;
  academyName: string;
  campusName: string;
}

export interface StaffAssignment {
  id: string;
  testId: string;
  classId: string;
  classTitle: string;
  title: string;
  opensAt: string;
  closesAt: string;
  resultsReleasedAt: string | null;
  test: { title: string; testType: string };
  counts: { started: number; submitted: number; graded: number };
}

export interface StudentAssignment {
  id: string;
  testId: string;
  classTitle: string;
  title: string;
  opensAt: string;
  closesAt: string;
  resultsReleasedAt: string | null;
  test: { title: string; testType: string };
  attempt: null | {
    id: string;
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
    currentModule: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING' | null;
    listeningBand?: number | null;
    readingBand?: number | null;
    writingBand?: number | null;
    speakingBand?: number | null;
    overallBand?: number | null;
  };
}

export interface ReportRow {
  user: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  attempt: null | {
    id: string;
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
    currentModule: string | null;
    startedAt: string;
    submittedAt: string | null;
    listeningRaw: number | null;
    listeningBand: number | null;
    readingRaw: number | null;
    readingBand: number | null;
    writingBand: number | null;
    speakingBand: number | null;
    overallBand: number | null;
  };
}

export interface AssignmentReport {
  assignment: {
    id: string;
    title: string;
    classId: string;
    classTitle: string;
    opensAt: string;
    closesAt: string;
    resultsReleasedAt: string | null;
    testId: string;
    testTitle: string;
    testType: string;
    summary: ExamSummary;
  };
  rows: ReportRow[];
}

export interface SheetRow {
  number: number;
  answer: string;
  correct: boolean | null;
  key: string;
}

export interface WritingCriteria {
  ta: number;
  cc: number;
  lr: number;
  gra: number;
}
export interface SpeakingCriteria {
  fc: number;
  lr: number;
  gra: number;
  p: number;
}

export interface AttemptResult {
  staff: boolean;
  candidate: { id: string; name: string; number: string };
  test: { id: string; title: string; testType: 'academic' | 'general_training' };
  assignment: { id: string; title: string; classTitle: string; resultsReleasedAt: string | null };
  attempt: {
    id: string;
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
    currentModule: Module | null;
    startedAt: string;
    submittedAt: string | null;
    gradedAt: string | null;
  };
  bands: { listening: number | null; reading: number | null; writing: number | null; speaking: number | null; overall: number | null };
  raw: { listening: number | null; reading: number | null };
  listening: SheetRow[];
  reading: SheetRow[];
  writing: {
    tasks: WritingTask[];
    texts: [string, string];
    scores: null | { task1: WritingCriteria; task2: WritingCriteria; comment?: string };
  };
  speaking: {
    content: SpeakingContent;
    recordings: { id: string; part: number; index: number; durationMs: number | null }[];
    scores: null | (SpeakingCriteria & { comment?: string });
  };
  transcripts?: { partNumber: number; context?: string; transcript: string }[];
}
