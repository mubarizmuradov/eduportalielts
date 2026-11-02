/**
 * Candidate view of an IELTS test, mirrors backend/src/ielts-format/exam.types.ts
 * (what buildIeltsExam() produces). No answers ever reach the browser during a test.
 */
export type Module = 'listening' | 'reading' | 'writing' | 'speaking';

export type QuestionType =
  | 'multiple_choice'
  | 'multiple_choice_multi'
  | 'true_false_not_given'
  | 'yes_no_not_given'
  | 'matching_headings'
  | 'matching_information'
  | 'matching_features'
  | 'matching_sentence_endings'
  | 'map_labelling'
  | 'completion'
  | 'sentence_completion'
  | 'diagram_label_completion'
  | 'short_answer';

export interface Option {
  key: string;
  text: string;
}
export interface WordLimit {
  maxWords: number;
  allowNumber: boolean;
  numberRule?: 'and_or' | 'or';
}
export type VisualKind = 'diagram' | 'map' | 'plan' | 'pictures';

interface GroupBase {
  range: [number, number];
  numbers: number[];
  instructions: string;
  title?: string;
  example?: string;
}

export type Group = GroupBase &
  (
    | { type: 'multiple_choice'; questions: { number: number; stem: string; image?: string; options: Option[] }[] }
    | { type: 'multiple_choice_multi'; items: { numbers: number[]; stem: string; options: Option[]; choose: number }[] }
    | {
        type: 'true_false_not_given' | 'yes_no_not_given';
        choices: { value: string; label: string }[];
        questions: { number: number; statement: string }[];
      }
    | { type: 'matching_headings'; textIndex: number; headings: Option[]; questions: { number: number; paragraph: string }[] }
    | {
        type: 'matching_information';
        scope?: 'paragraphs' | 'texts';
        textIndex: number;
        /** Letters to choose from: paragraph labels, or text labels when scope is "texts". */
        paragraphs: string[];
        allowReuse: boolean;
        questions: { number: number; statement: string }[];
      }
    | { type: 'matching_features'; optionsTitle?: string; options: Option[]; allowReuse: boolean; questions: { number: number; statement: string }[] }
    | { type: 'matching_sentence_endings'; endings: Option[]; questions: { number: number; sentenceStart: string }[] }
    | {
        type: 'map_labelling';
        visualKind?: 'map' | 'plan' | 'diagram';
        image: string;
        letters: string[];
        /** Letters drawn over the image (percent); absent when the image shows them. */
        letterPositions?: { key: string; x: number; y: number }[];
        questions: { number: number; label: string }[];
      }
    | {
        type: 'completion';
        variant: 'form' | 'note' | 'table' | 'flow_chart' | 'summary';
        answerMode: 'write' | 'select';
        wordLimit?: WordLimit;
        options?: Option[];
        lines?: { text: string; style: 'heading' | 'text' | 'bullet' | 'indent' }[];
        table?: { columns: string[]; rows: string[][] };
        steps?: string[];
        flow?: { nodes: { id: string; text: string }[]; edges: { from: string; to: string }[] };
        gaps: { number: number }[];
      }
    | { type: 'sentence_completion'; wordLimit: WordLimit; questions: { number: number; sentence: string }[] }
    | {
        type: 'diagram_label_completion';
        visualKind?: VisualKind;
        image: string;
        answerMode?: 'write' | 'select';
        wordLimit?: WordLimit;
        options?: Option[];
        labels: { number: number; x: number; y: number }[];
      }
    | {
        type: 'short_answer';
        wordLimit: WordLimit;
        /** `numbers`: one question asking for several answers in any order ("Which TWO …?"). */
        questions: ({ number: number; question: string } | { numbers: number[]; question: string })[];
      }
  );

export interface ListeningPart {
  partNumber: number;
  audio: string;
  audioSeconds: number;
  intro: string;
  questionGroups: Group[];
}
export interface ListeningContent {
  parts: ListeningPart[];
  reviewSeconds: number;
}

export interface ReadingText {
  label?: string;
  title: string;
  subtitle?: string;
  paragraphs: { label?: string; text: string }[];
  image?: string;
  imageCaption?: string;
  glossary?: { term: string; definition: string }[];
}
export interface ReadingSection {
  sectionNumber: number;
  intro: string;
  texts: ReadingText[];
  questionGroups: Group[];
}
export interface ReadingContent {
  sections: ReadingSection[];
  minutes: number;
}

export interface WritingTask {
  taskNumber: 1 | 2;
  minutes: number;
  minWords: number;
  body: string;
  image?: string;
  images?: string[];
}
export interface WritingContent {
  tasks: WritingTask[];
  minutes: number;
}

export interface SpokenQuestion {
  text: string;
  audio?: string;
}
export interface SpeakingContent {
  part1: { topics: { topic: string; questions: SpokenQuestion[] }[]; answerSeconds: number };
  part2: {
    topic: string;
    bulletPoints: string[];
    finalPrompt: string;
    introAudio?: string;
    prepSeconds: number;
    talkSeconds: number;
    roundingOff: SpokenQuestion[];
    roundingOffSeconds: number;
  };
  part3: { themes: { theme: string; questions: SpokenQuestion[] }[]; answerSeconds: number };
}

export interface CandidateExam {
  testType: 'academic' | 'general_training';
  title: string;
  listening: ListeningContent;
  reading: ReadingContent;
  writing: WritingContent;
  speaking: SpeakingContent;
}

export interface AttemptState {
  attempt: {
    id: string;
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
    currentModule: Module | null;
    moduleStartedAt: string | null;
    moduleDeadline: string | null;
    serverNow: string;
  };
  candidate: { name: string; number: string };
  test: { id: string; title: string; testType: 'academic' | 'general_training' };
  assignment: { id: string; title: string; resultsReleased: boolean; speakingMode?: SpeakingMode };
  content: ListeningContent | ReadingContent | WritingContent | SpeakingContent | null;
  saved:
    | { answers: Record<string, string> }
    | { task1: string; task2: string }
    | { recordings: { part: number; index: number }[] }
    | null;
}

export type Answers = Record<string, string>;
export type SpeakingMode = 'RECORDED' | 'FACE_TO_FACE';

export const assetUrl = (testId: string, key: string) => `/api/tests/${testId}/assets/${encodeURIComponent(key)}`;
