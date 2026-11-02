/**
 * buildIeltsExam(): turns an AI-generated IELTS Test Package (package.schema.ts)
 * into a ready-to-sit mock exam.
 *
 *   1. validates the JSON against the schema,
 *   2. checks every IELTS structural rule (4 listening parts × 10 questions,
 *      3 reading sections with 40 questions, numbering 1-40 without gaps,
 *      question types allowed per skill, gaps {{n}}, answer keys, word limits,
 *      asset references and real file types…),
 *   3. adds the standard IELTS wording (instructions, "Questions 1–5",
 *      timings, writing rubrics),
 *   4. splits the result into a candidate view (no answers, no transcripts),
 *      an answer key and a staff review.
 *
 * Pure and synchronous: no database, no network. The import service stores
 * the result (modules/tests/tests.service.ts).
 */
import { expandAccepted, wordLimitPhrase, withinWordLimit } from './answer-text';
import type {
  AnswerKey,
  BuildIssue,
  BuildResult,
  BuiltAsset,
  CandidateExam,
  CandidateGroup,
  CandidateReadingSection,
  CandidateSpeaking,
  CandidateWritingTask,
  ExamSummary,
  KeyEntry,
} from './exam.types';
import { isSafeSvg, MAX_AUDIO_BYTES, MAX_IMAGE_BYTES, sniffMime } from './media-sniff';
import {
  ieltsPackageSchema,
  type IeltsPackage,
  type QuestionGroup,
  type QuestionType,
  type ReadingText,
  type WordLimit,
} from './package.schema';

// ---------------------------------------------------------------- IELTS constants

export const TIMING = {
  /** Computer-delivered IELTS: 2 minutes to check answers after the recording. */
  listeningReviewSeconds: 120,
  readingMinutes: 60,
  writingMinutes: 60,
  writingTask1Minutes: 20,
  writingTask2Minutes: 40,
  speakingPart1AnswerSeconds: 30,
  speakingPart2PrepSeconds: 60,
  speakingPart2TalkSeconds: 120,
  speakingRoundingOffSeconds: 30,
  speakingPart3AnswerSeconds: 60,
} as const;

export const LISTENING_QUESTIONS_PER_PART = 10;
export const QUESTIONS_PER_MODULE = 40;

export const LISTENING_TYPES: ReadonlySet<QuestionType> = new Set([
  'multiple_choice',
  'multiple_choice_multi',
  'matching_features',
  'map_labelling',
  'completion',
  'sentence_completion',
  'diagram_label_completion',
  'short_answer',
]);

export const READING_TYPES: ReadonlySet<QuestionType> = new Set([
  'multiple_choice',
  'multiple_choice_multi',
  'true_false_not_given',
  'yes_no_not_given',
  'matching_headings',
  'matching_information',
  'matching_features',
  'matching_sentence_endings',
  'completion',
  'sentence_completion',
  'diagram_label_completion',
  'short_answer',
]);

/**
 * General Training reading: texts per section. The official format is 2-3
 * short texts, then 2 work-related texts, then 1 long text; a composite text
 * (several adverts) may also be given as separate labelled texts.
 */
const GT_TEXTS_PER_SECTION: Record<number, { usual: [number, number]; allowed: [number, number] }> = {
  1: { usual: [2, 3], allowed: [1, 5] },
  2: { usual: [2, 2], allowed: [1, 3] },
  3: { usual: [1, 1], allowed: [1, 1] },
};

const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv'];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const GAP = /\{\{\s*([^{}]*?)\s*\}\}/g;

// ---------------------------------------------------------------- helpers

class Issues {
  errors: BuildIssue[] = [];
  warnings: BuildIssue[] = [];
  error(path: string, message: string) {
    if (this.errors.length < 200) this.errors.push({ path, message });
  }
  warn(path: string, message: string) {
    if (this.warnings.length < 200) this.warnings.push({ path, message });
  }
}

const listLetters = (keys: string[]) =>
  keys.length <= 4 ? `${keys.slice(0, -1).join(', ')} or ${keys[keys.length - 1]}` : `${keys[0]}–${keys[keys.length - 1]}`;
const range = (keys: string[]) => `${keys[0]}–${keys[keys.length - 1]}`;
const countWordsOf = (s: string) => s.split(/\s+/).filter(Boolean).length;
const NUMBER_NAMES = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN'];
const countName = (n: number) => NUMBER_NAMES[n] ?? String(n);

/** Every number in the order the candidate meets it. */
export function groupNumbers(g: QuestionGroup): number[] {
  switch (g.type) {
    case 'multiple_choice_multi':
      return g.items.flatMap((i) => i.numbers);
    case 'completion':
      return g.gaps.map((x) => x.number);
    case 'diagram_label_completion':
      return g.labels.map((l) => l.number);
    case 'short_answer':
      return g.questions.flatMap((q) => ('numbers' in q ? q.numbers : [q.number]));
    default:
      return g.questions.map((q) => q.number);
  }
}

/** Fields that give an answer away; never part of the candidate view. */
const SECRET_FIELDS = new Set(['answer', 'answers', 'answerUnits', 'explanation']);

/** Copy without any answer / explanation property (deep). */
function stripAnswers(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripAnswers);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) if (!SECRET_FIELDS.has(k)) out[k] = stripAnswers(v);
    return out;
  }
  return value;
}

function gapsIn(texts: string[]): string[] {
  const found: string[] = [];
  for (const t of texts) for (const m of t.matchAll(GAP)) found.push(m[1]);
  return found;
}

function checkSequentialKeys(keys: string[], alphabet: string[], path: string, what: string, issues: Issues) {
  const expected = alphabet.slice(0, keys.length);
  if (keys.some((k, i) => k !== expected[i]))
    issues.error(path, `${what} must be ${expected.join(', ')} in this order (got ${keys.join(', ')})`);
}

function checkAccepted(answers: string[], limit: WordLimit, path: string, issues: Issues) {
  answers.forEach((a, i) => {
    let variants: string[];
    try {
      variants = expandAccepted(a);
    } catch (e) {
      issues.error(`${path}.${i}`, (e as Error).message);
      return;
    }
    if (variants.length === 0) issues.error(`${path}.${i}`, 'empty answer');
    for (const v of variants)
      if (!withinWordLimit(v, limit))
        issues.error(`${path}.${i}`, `"${v}" breaks the word limit (${wordLimitPhrase(limit)})`);
  });
}

// ---------------------------------------------------------------- instructions

interface GroupContext {
  module: 'listening' | 'reading';
  /** "Reading Passage 2" (Academic) / "the text" (General Training). */
  passageName: string;
  text?: ReadingText;
  /** All texts of the reading section (matching information over texts). */
  sectionTexts?: ReadingText[];
}

const COMPLETION_NOUN = { form: 'form', note: 'notes', table: 'table', flow_chart: 'flow-chart', summary: 'summary' };

function writeRule(limit: WordLimit, ctx: GroupContext) {
  return ctx.module === 'reading'
    ? `Choose **${wordLimitPhrase(limit)}** from the passage for each answer.`
    : `Write **${wordLimitPhrase(limit)}** for each answer.`;
}

function defaultInstructions(g: QuestionGroup, ctx: GroupContext): string {
  switch (g.type) {
    case 'multiple_choice': {
      const keys = g.questions[0].options.map((o) => o.key);
      return `Choose the correct letter, **${listLetters(keys)}**.`;
    }
    case 'multiple_choice_multi': {
      const n = g.items[0].numbers.length;
      return `Choose **${NUMBER_NAMES[n]}** letters, **${range(g.items[0].options.map((o) => o.key))}**.`;
    }
    case 'true_false_not_given':
      return [
        `Do the following statements agree with the information given in ${ctx.passageName}?`,
        'Choose',
        '**TRUE** if the statement agrees with the information',
        '**FALSE** if the statement contradicts the information',
        '**NOT GIVEN** if there is no information on this',
      ].join('\n');
    case 'yes_no_not_given':
      return [
        `Do the following statements agree with the claims of the writer in ${ctx.passageName}?`,
        'Choose',
        '**YES** if the statement agrees with the claims of the writer',
        '**NO** if the statement contradicts the claims of the writer',
        '**NOT GIVEN** if it is impossible to say what the writer thinks about this',
      ].join('\n');
    case 'matching_headings': {
      const labels = (ctx.text?.paragraphs ?? []).flatMap((p) => (p.label ? [p.label] : []));
      return [
        `${ctx.passageName[0].toUpperCase()}${ctx.passageName.slice(1)} has ${labels.length} paragraphs, **${range(labels)}**.`,
        'Choose the correct heading for each paragraph from the list of headings below.',
      ].join('\n');
    }
    case 'matching_information': {
      if (g.scope === 'texts') {
        const labels = (ctx.sectionTexts ?? []).flatMap((t) => (t.label ? [t.label] : []));
        return [
          `Look at the ${labels.length} texts, **${range(labels)}**.`,
          'Which text contains the following information?',
          ...(g.allowReuse ? ['**NB** You may use any letter more than once.'] : []),
        ].join('\n');
      }
      const labels = (ctx.text?.paragraphs ?? []).flatMap((p) => (p.label ? [p.label] : []));
      return [
        `${ctx.passageName[0].toUpperCase()}${ctx.passageName.slice(1)} has ${labels.length} paragraphs, **${range(labels)}**.`,
        'Which paragraph contains the following information?',
        ...(g.allowReuse ? ['**NB** You may use any letter more than once.'] : []),
      ].join('\n');
    }
    case 'matching_features': {
      const what = g.optionsTitle ? g.optionsTitle.replace(/^list of /i, '').toLowerCase() : 'options';
      return [
        `Match each statement with the correct ${what.replace(/s$/, '')}, **${range(g.options.map((o) => o.key))}**.`,
        ...(g.allowReuse ? ['**NB** You may use any letter more than once.'] : []),
      ].join('\n');
    }
    case 'matching_sentence_endings':
      return `Complete each sentence with the correct ending, **${range(g.endings.map((o) => o.key))}**, below.`;
    case 'map_labelling':
      return `Label the ${g.visualKind} below.\nChoose the correct letter, **${range(g.letters)}**.`;
    case 'completion': {
      const noun = COMPLETION_NOUN[g.variant];
      if (g.answerMode === 'select')
        return `Complete the ${noun} using the list of words, **${range(g.options!.map((o) => o.key))}**, below.`;
      return `Complete the ${noun} below.\n${writeRule(g.wordLimit!, ctx)}`;
    }
    case 'sentence_completion':
      return `Complete the sentences below.\n${writeRule(g.wordLimit, ctx)}`;
    case 'diagram_label_completion': {
      const what = g.visualKind === 'pictures' ? 'pictures' : g.visualKind;
      const first = g.visualKind === 'pictures' ? 'Look at the pictures below.' : `Label the ${what} below.`;
      if (g.answerMode === 'select') {
        const keys = (g.options ?? []).map((o) => o.key);
        const [a, b] = [g.labels[0].number, g.labels[g.labels.length - 1].number];
        return `${first}\nChoose **${countName(g.labels.length)}** answers from the box and write the correct letter, **${range(keys)}**, next to Questions ${a}–${b}.`;
      }
      return `${first}\n${writeRule(g.wordLimit!, ctx)}`;
    }
    case 'short_answer':
      return `Answer the questions below.\n${writeRule(g.wordLimit, ctx)}`;
  }
}

// ---------------------------------------------------------------- groups

interface GroupResult {
  candidate: CandidateGroup;
  numbers: number[];
}

/** Where processGroup writes the marking data of a module. */
interface ModuleOut {
  key: AnswerKey;
  staff: Record<number, string>;
  explain: Record<number, string>;
}

function processGroup(
  g: QuestionGroup,
  path: string,
  ctx: GroupContext,
  out: ModuleOut,
  issues: Issues,
  useAsset: (id: string, kind: 'audio' | 'image', path: string) => void,
): GroupResult {
  const allowed = ctx.module === 'listening' ? LISTENING_TYPES : READING_TYPES;
  if (!allowed.has(g.type)) issues.error(`${path}.type`, `"${g.type}" is not an IELTS ${ctx.module} question type`);

  const numbers = groupNumbers(g);
  const labels = (ctx.text?.paragraphs ?? []).flatMap((p) => (p.label ? [p.label] : []));
  const extra: Record<string, unknown> = {};
  const { key, staff } = out;

  const explain = (ns: number[], e: string | undefined) => {
    if (e) for (const n of ns) out.explain[n] = e;
  };
  const choice = (n: number, answer: string, shown = answer) => {
    key[n] = { kind: 'choice', answer };
    staff[n] = shown;
  };
  const textKey = (n: number, answers: string[], wordLimit: WordLimit) => {
    key[n] = { kind: 'text', answers, wordLimit };
    staff[n] = answers.join(' / ');
  };
  const bank = (keys: string[], p: string, what: string) => {
    checkSequentialKeys(keys, LETTERS, p, what, issues);
  };

  switch (g.type) {
    case 'multiple_choice':
      g.questions.forEach((q, i) => {
        const keys = q.options.map((o) => o.key);
        bank(keys, `${path}.questions.${i}.options`, 'options');
        if (!keys.includes(q.answer)) issues.error(`${path}.questions.${i}.answer`, `answer ${q.answer} is not an option`);
        if (q.image) useAsset(q.image, 'image', `${path}.questions.${i}.image`);
        choice(q.number, q.answer);
        explain([q.number], q.explanation);
      });
      break;

    case 'multiple_choice_multi':
      g.items.forEach((item, i) => {
        const p = `${path}.items.${i}`;
        const keys = item.options.map((o) => o.key);
        bank(keys, `${p}.options`, 'options');
        if (item.answers.length !== item.numbers.length)
          issues.error(`${p}.answers`, `${item.numbers.length} question numbers need exactly ${item.numbers.length} answers`);
        if (new Set(item.answers).size !== item.answers.length) issues.error(`${p}.answers`, 'answers must be different letters');
        item.answers.forEach((a, j) => {
          if (!keys.includes(a)) issues.error(`${p}.answers.${j}`, `answer ${a} is not an option`);
        });
        if (item.options.length <= item.answers.length) issues.error(`${p}.options`, 'needs more options than answers');
        for (const n of item.numbers) {
          key[n] = { kind: 'multi', numbers: item.numbers, answers: item.answers };
          staff[n] = `${item.answers.join(', ')} (in either order)`;
        }
        explain(item.numbers, item.explanation);
      });
      extra.items = g.items.map((item) => ({ ...(stripAnswers(item) as object), choose: item.numbers.length }));
      break;

    case 'true_false_not_given':
    case 'yes_no_not_given': {
      const choices = g.type === 'true_false_not_given' ? ['TRUE', 'FALSE', 'NOT_GIVEN'] : ['YES', 'NO', 'NOT_GIVEN'];
      extra.choices = choices.map((value) => ({ value, label: value.replace('_', ' ') }));
      g.questions.forEach((q) => {
        choice(q.number, q.answer, q.answer.replace('_', ' '));
        explain([q.number], q.explanation);
      });
      break;
    }

    case 'matching_headings': {
      const keys = g.headings.map((h) => h.key);
      checkSequentialKeys(keys, ROMAN, `${path}.headings`, 'heading numbers', issues);
      if (!ctx.text) issues.error(`${path}.textIndex`, 'no reading text at this index');
      // Official format: more headings than paragraphs, each heading used once.
      if (g.headings.length <= g.questions.length)
        issues.error(`${path}.headings`, 'IELTS gives more headings than paragraphs (add distractors)');
      const usedParagraphs = new Set<string>();
      const usedHeadings = new Set<string>();
      g.questions.forEach((q, i) => {
        const p = `${path}.questions.${i}`;
        if (!labels.includes(q.paragraph)) issues.error(`${p}.paragraph`, `the text has no paragraph ${q.paragraph}`);
        if (usedParagraphs.has(q.paragraph)) issues.error(`${p}.paragraph`, `paragraph ${q.paragraph} is asked twice`);
        if (!keys.includes(q.answer)) issues.error(`${p}.answer`, `heading ${q.answer} is not in the list`);
        if (usedHeadings.has(q.answer)) issues.error(`${p}.answer`, `heading ${q.answer} is the answer twice`);
        usedParagraphs.add(q.paragraph);
        usedHeadings.add(q.answer);
        choice(q.number, q.answer);
        explain([q.number], q.explanation);
      });
      break;
    }

    case 'matching_information': {
      let targets = labels;
      if (g.scope === 'texts') {
        const texts = ctx.sectionTexts ?? [];
        targets = texts.flatMap((t) => (t.label ? [t.label] : []));
        if (targets.length !== texts.length || targets.length < 2)
          issues.error(`${path}.scope`, 'scope "texts" needs two or more texts in the section, each with a label (A, B, C …)');
      } else {
        if (!ctx.text) issues.error(`${path}.textIndex`, 'no reading text at this index');
        if (labels.length < 3) issues.error(`${path}.textIndex`, 'the text needs labelled paragraphs (A, B, C …)');
      }
      extra.paragraphs = targets;
      g.questions.forEach((q, i) => {
        if (!targets.includes(q.answer))
          issues.error(
            `${path}.questions.${i}.answer`,
            g.scope === 'texts' ? `the section has no text ${q.answer}` : `the text has no paragraph ${q.answer}`,
          );
        choice(q.number, q.answer);
        explain([q.number], q.explanation);
      });
      if (!g.allowReuse && new Set(g.questions.map((q) => q.answer)).size !== g.questions.length)
        issues.error(`${path}.questions`, 'a letter is used twice but allowReuse is false');
      break;
    }

    case 'matching_features': {
      const keys = g.options.map((o) => o.key);
      bank(keys, `${path}.options`, 'options');
      g.questions.forEach((q, i) => {
        if (!keys.includes(q.answer)) issues.error(`${path}.questions.${i}.answer`, `answer ${q.answer} is not an option`);
        choice(q.number, q.answer);
        explain([q.number], q.explanation);
      });
      if (!g.allowReuse && new Set(g.questions.map((q) => q.answer)).size !== g.questions.length)
        issues.error(`${path}.questions`, 'an option is used twice but allowReuse is false');
      break;
    }

    case 'matching_sentence_endings': {
      const keys = g.endings.map((o) => o.key);
      bank(keys, `${path}.endings`, 'endings');
      if (g.endings.length <= g.questions.length)
        issues.error(`${path}.endings`, 'IELTS gives more endings than sentences (add distractors)');
      g.questions.forEach((q, i) => {
        if (!keys.includes(q.answer)) issues.error(`${path}.questions.${i}.answer`, `ending ${q.answer} is not in the list`);
        choice(q.number, q.answer);
        explain([q.number], q.explanation);
      });
      if (new Set(g.questions.map((q) => q.answer)).size !== g.questions.length)
        issues.error(`${path}.questions`, 'each ending can be the answer only once');
      break;
    }

    case 'map_labelling':
      useAsset(g.image, 'image', `${path}.image`);
      bank(g.letters, `${path}.letters`, `${g.visualKind} letters`);
      if (g.letters.length <= g.questions.length) issues.warn(`${path}.letters`, 'IELTS maps show more letters than questions');
      if (g.letterPositions) {
        const placed = g.letterPositions.map((l) => l.key);
        if ([...placed].sort().join() !== [...g.letters].sort().join() || new Set(placed).size !== placed.length)
          issues.error(`${path}.letterPositions`, `give one position for each letter ${g.letters.join(', ')}`);
      }
      g.questions.forEach((q, i) => {
        if (!g.letters.includes(q.answer)) issues.error(`${path}.questions.${i}.answer`, `letter ${q.answer} is not on the ${g.visualKind}`);
        choice(q.number, q.answer);
        explain([q.number], q.explanation);
      });
      if (new Set(g.questions.map((q) => q.answer)).size !== g.questions.length)
        issues.error(`${path}.questions`, 'two places can not have the same letter');
      break;

    case 'completion': {
      const texts =
        g.variant === 'table'
          ? [...(g.table?.columns ?? []), ...(g.table?.rows.flat() ?? [])]
          : g.variant === 'flow_chart'
            ? (g.steps ?? g.flow?.nodes.map((n) => n.text) ?? [])
            : (g.lines ?? []).map((l) => l.text);
      const found = gapsIn(texts);
      const gapNumbers = g.gaps.map((x) => x.number);
      found.forEach((f) => {
        if (!/^\d+$/.test(f)) issues.error(path, `"{{${f}}}" is not a gap: write gaps as {{question number}}`);
      });
      const foundNums = found.filter((f) => /^\d+$/.test(f)).map(Number);
      if (foundNums.join(',') !== gapNumbers.join(','))
        issues.error(
          path,
          `gaps in the content (${foundNums.join(', ') || 'none'}) must match "gaps" (${gapNumbers.join(', ')}), once each, in order`,
        );
      if (g.flow) {
        const ids = g.flow.nodes.map((n) => n.id);
        if (new Set(ids).size !== ids.length) issues.error(`${path}.flow.nodes`, 'node ids must be unique');
        g.flow.edges.forEach((e, i) => {
          if (!ids.includes(e.from) || !ids.includes(e.to))
            issues.error(`${path}.flow.edges.${i}`, `arrow ${e.from} → ${e.to} points to an unknown box`);
          if (e.from === e.to) issues.error(`${path}.flow.edges.${i}`, 'an arrow can not point to its own box');
        });
        const linked = new Set(g.flow.edges.flatMap((e) => [e.from, e.to]));
        ids.forEach((id, i) => {
          if (!linked.has(id)) issues.error(`${path}.flow.nodes.${i}`, `box "${id}" has no arrow`);
        });
      }
      if (g.answerMode === 'select') {
        const keys = g.options!.map((o) => o.key);
        bank(keys, `${path}.options`, 'word bank');
        if (keys.length <= g.gaps.length) issues.warn(`${path}.options`, 'IELTS word banks have more words than gaps');
      }
      g.gaps.forEach((gap, i) => {
        if ('answers' in gap) {
          checkAccepted(gap.answers, g.wordLimit!, `${path}.gaps.${i}.answers`, issues);
          textKey(gap.number, gap.answers, g.wordLimit!);
        } else {
          if (!g.options!.some((o) => o.key === gap.answer))
            issues.error(`${path}.gaps.${i}.answer`, `${gap.answer} is not in the word bank`);
          choice(gap.number, gap.answer);
        }
        explain([gap.number], gap.explanation);
      });
      if (g.variant === 'table' && g.table && g.table.rows.some((r) => r.length !== g.table!.columns.length))
        issues.error(`${path}.table.rows`, 'every row needs one cell per column');
      if (g.variant === 'form' && ctx.module === 'reading') issues.error(`${path}.variant`, 'form completion is a listening task');
      break;
    }

    case 'sentence_completion':
      g.questions.forEach((q, i) => {
        const found = gapsIn([q.sentence]);
        if (found.length !== 1 || found[0] !== String(q.number))
          issues.error(`${path}.questions.${i}.sentence`, `the sentence needs exactly one gap {{${q.number}}}`);
        checkAccepted(q.answers, g.wordLimit, `${path}.questions.${i}.answers`, issues);
        textKey(q.number, q.answers, g.wordLimit);
        explain([q.number], q.explanation);
      });
      break;

    case 'diagram_label_completion': {
      useAsset(g.image, 'image', `${path}.image`);
      if (ctx.module === 'reading' && g.visualKind !== 'diagram')
        issues.error(`${path}.visualKind`, 'reading labelling is always a diagram (maps and plans are listening tasks)');
      if (ctx.module === 'reading' && g.answerMode === 'select')
        issues.warn(`${path}.answerMode`, 'reading diagram labels are normally words from the passage (answerMode "write")');
      const keys = (g.options ?? []).map((o) => o.key);
      if (g.answerMode === 'select') {
        bank(keys, `${path}.options`, 'options');
        if (keys.length <= g.labels.length) issues.warn(`${path}.options`, 'IELTS gives more options than gaps');
        if (new Set(g.labels.map((l) => l.answer)).size !== g.labels.length)
          issues.error(`${path}.labels`, 'each option can be the answer only once');
      }
      g.labels.forEach((l, i) => {
        if (g.answerMode === 'write' && l.answers) {
          checkAccepted(l.answers, g.wordLimit!, `${path}.labels.${i}.answers`, issues);
          textKey(l.number, l.answers, g.wordLimit!);
        } else if (l.answer) {
          if (!keys.includes(l.answer)) issues.error(`${path}.labels.${i}.answer`, `${l.answer} is not in the box`);
          choice(l.number, l.answer);
        }
        explain([l.number], l.explanation);
      });
      break;
    }

    case 'short_answer':
      g.questions.forEach((q, i) => {
        const p = `${path}.questions.${i}`;
        if ('numbers' in q) {
          if (q.answerUnits.length !== q.numbers.length)
            issues.error(`${p}.answerUnits`, `${q.numbers.length} question numbers need exactly ${q.numbers.length} answer units`);
          q.answerUnits.forEach((u, j) => checkAccepted(u, g.wordLimit, `${p}.answerUnits.${j}`, issues));
          const all = q.answerUnits.flatMap((u) => u.flatMap((a) => safeExpand(a)));
          if (new Set(all).size !== all.length)
            issues.error(`${p}.answerUnits`, 'two answer units accept the same answer, so the candidate could score twice');
          if (!/\b(TWO|THREE|two|three)\b/.test(q.question))
            issues.warn(`${p}.question`, `the question should say how many answers it wants (e.g. "Which TWO …")`);
          for (const n of q.numbers) {
            key[n] = { kind: 'textset', numbers: q.numbers, units: q.answerUnits, wordLimit: g.wordLimit };
            staff[n] = `${q.answerUnits.map((u) => u.join(' / ')).join('; ')} (in any order)`;
          }
          explain(q.numbers, q.explanation);
        } else {
          checkAccepted(q.answers, g.wordLimit, `${p}.answers`, issues);
          textKey(q.number, q.answers, g.wordLimit);
          explain([q.number], q.explanation);
        }
      });
      break;
  }

  // Inside a group the numbers run without gaps: "Questions 14–18".
  numbers.forEach((n, i) => {
    if (i > 0 && n !== numbers[i - 1] + 1)
      issues.error(path, `question numbers must be consecutive inside a group (${numbers.join(', ')})`);
  });

  const candidate = {
    ...(stripAnswers(g) as Record<string, unknown>),
    ...extra,
    type: g.type,
    range: [numbers[0], numbers[numbers.length - 1]],
    numbers,
    instructions: g.instructions ?? defaultInstructions(g, ctx),
  } as CandidateGroup;
  return { candidate, numbers };
}

function safeExpand(answer: string): string[] {
  try {
    return expandAccepted(answer);
  } catch {
    return [];
  }
}

/** Checks that a module's numbers are exactly 1..40 in order. */
function checkModuleNumbering(all: number[], path: string, issues: Issues) {
  const expected = Array.from({ length: QUESTIONS_PER_MODULE }, (_, i) => i + 1);
  if (all.join(',') !== expected.join(',')) {
    const dup = all.filter((n, i) => all.indexOf(n) !== i);
    const missing = expected.filter((n) => !all.includes(n));
    issues.error(
      path,
      `questions must be numbered 1-40 in order, once each (count ${all.length}` +
        (dup.length ? `, duplicates ${[...new Set(dup)].join(', ')}` : '') +
        (missing.length ? `, missing ${missing.join(', ')}` : '') +
        ')',
    );
  }
}

function countTypes(groups: QuestionGroup[]) {
  const out: Partial<Record<QuestionType, number>> = {};
  for (const g of groups) out[g.type] = (out[g.type] ?? 0) + groupNumbers(g).length;
  return out;
}

// ---------------------------------------------------------------- main

export function buildIeltsExam(input: unknown): BuildResult {
  const parsed = ieltsPackageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.slice(0, 200).map((i) => ({ path: i.path.join('.'), message: i.message })),
      warnings: [],
    };
  }
  const pkg: IeltsPackage = parsed.data;
  const issues = new Issues();

  // ---- assets
  const assetById = new Map<string, BuiltAsset>();
  const used = new Set<string>();
  let assetBytes = 0;
  pkg.assets.forEach((a, i) => {
    const path = `assets.${i}`;
    if (assetById.has(a.id)) issues.error(`${path}.id`, `duplicate asset id "${a.id}"`);
    const built: BuiltAsset = { id: a.id, kind: a.kind, mimeType: a.mimeType, durationSeconds: a.durationSeconds, alt: a.alt };
    if (a.data !== undefined) {
      const buf = Buffer.from(a.data.replace(/\s+/g, ''), 'base64');
      const max = a.kind === 'audio' ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES;
      if (buf.length === 0) issues.error(`${path}.data`, 'empty file');
      else if (buf.length > max) issues.error(`${path}.data`, `file is larger than ${max / 1024 / 1024} MB`);
      const sniffed = sniffMime(buf);
      if (buf.length > 0 && sniffed !== a.mimeType)
        issues.error(`${path}.mimeType`, `file content is ${sniffed ?? 'unknown'}, declared ${a.mimeType}`);
      if (sniffed === 'image/svg+xml' && !isSafeSvg(buf)) issues.error(`${path}.data`, 'SVG contains scripts or active content');
      built.data = buf;
      assetBytes += buf.length;
    } else {
      built.url = a.url;
    }
    assetById.set(a.id, built);
  });
  const useAsset = (id: string, kind: 'audio' | 'image', path: string) => {
    const a = assetById.get(id);
    if (!a) return issues.error(path, `unknown asset "${id}"`);
    if (a.kind !== kind) return issues.error(path, `asset "${id}" is ${a.kind}, ${kind} expected`);
    used.add(id);
  };

  const answerKey = { listening: {} as AnswerKey, reading: {} as AnswerKey };
  const staffAnswers = { listening: {} as Record<number, string>, reading: {} as Record<number, string> };
  const explanations = { listening: {} as Record<number, string>, reading: {} as Record<number, string> };
  const listeningOut: ModuleOut = { key: answerKey.listening, staff: staffAnswers.listening, explain: explanations.listening };
  const readingOut: ModuleOut = { key: answerKey.reading, staff: staffAnswers.reading, explain: explanations.reading };

  // ---- listening: 4 parts × 10 questions
  let listeningSeconds = 0;
  const listeningNumbers: number[] = [];
  const listeningParts = pkg.listening.parts.map((part, pi) => {
    const path = `listening.parts.${pi}`;
    if (part.partNumber !== pi + 1) issues.error(`${path}.partNumber`, `expected part ${pi + 1}`);
    useAsset(part.audio, 'audio', `${path}.audio`);
    const seconds = assetById.get(part.audio)?.durationSeconds ?? 0;
    listeningSeconds += seconds;
    const partNumbers: number[] = [];
    const groups = part.questionGroups.map((g, gi) => {
      const r = processGroup(
        g,
        `${path}.questionGroups.${gi}`,
        { module: 'listening', passageName: 'the recording' },
        listeningOut,
        issues,
        useAsset,
      );
      partNumbers.push(...r.numbers);
      return r.candidate;
    });
    const first = pi * LISTENING_QUESTIONS_PER_PART + 1;
    const expected = Array.from({ length: LISTENING_QUESTIONS_PER_PART }, (_, i) => first + i);
    if (partNumbers.join(',') !== expected.join(','))
      issues.error(`${path}.questionGroups`, `part ${pi + 1} must have questions ${first}-${first + 9} in order (got ${partNumbers.join(', ')})`);
    listeningNumbers.push(...partNumbers);
    return {
      partNumber: pi + 1,
      audio: part.audio,
      audioSeconds: seconds,
      intro: `Listen and answer questions ${first}–${first + LISTENING_QUESTIONS_PER_PART - 1}.`,
      questionGroups: groups,
    };
  });
  checkModuleNumbering(listeningNumbers, 'listening', issues);
  if (listeningSeconds > 0 && (listeningSeconds < 600 || listeningSeconds > 2400))
    issues.warn('listening', `recordings last ${Math.round(listeningSeconds / 60)} minutes; IELTS Listening is about 30 minutes`);

  // ---- reading: 3 sections, 40 questions
  const readingNumbers: number[] = [];
  let readingWords = 0;
  let readingTexts = 0;
  const readingSections: CandidateReadingSection[] = pkg.reading.sections.map((section, si) => {
    const path = `reading.sections.${si}`;
    if (section.sectionNumber !== si + 1) issues.error(`${path}.sectionNumber`, `expected section ${si + 1}`);
    if (pkg.testType === 'academic' && section.texts.length !== 1)
      issues.error(`${path}.texts`, 'Academic Reading has exactly one passage per section');
    if (pkg.testType === 'general_training') {
      const { usual, allowed } = GT_TEXTS_PER_SECTION[si + 1];
      const n = section.texts.length;
      const span = ([a, b]: [number, number]) => (a === b ? `${a}` : `${a}-${b}`);
      if (n < allowed[0] || n > allowed[1])
        issues.error(`${path}.texts`, `General Training section ${si + 1} has ${span(allowed)} text(s)`);
      else if (n < usual[0] || n > usual[1])
        issues.warn(`${path}.texts`, `General Training section ${si + 1} usually has ${span(usual)} text(s) (got ${n})`);
    }
    const textLabels = section.texts.flatMap((t) => (t.label ? [t.label] : []));
    if (textLabels.length > 0) {
      if (textLabels.length !== section.texts.length) issues.error(`${path}.texts`, 'label every text of the section or none');
      else checkSequentialKeys(textLabels, LETTERS, `${path}.texts`, 'text labels', issues);
    }
    section.texts.forEach((t, ti) => {
      readingTexts++;
      const words = t.paragraphs.reduce((n, p) => n + countWordsOf(p.text), 0);
      readingWords += words;
      if (pkg.testType === 'academic' && words < 500)
        issues.warn(`${path}.texts.${ti}`, `passage has ${words} words; Academic passages are usually 700-1000 words`);
      const labels = t.paragraphs.flatMap((p) => (p.label ? [p.label] : []));
      if (new Set(labels).size !== labels.length) issues.error(`${path}.texts.${ti}.paragraphs`, 'paragraph labels must be unique');
      if (labels.length > 0) checkSequentialKeys(labels, LETTERS, `${path}.texts.${ti}.paragraphs`, 'paragraph labels', issues);
      if (t.image) useAsset(t.image, 'image', `${path}.texts.${ti}.image`);
    });
    const sectionNumbers: number[] = [];
    const groups = section.questionGroups.map((g, gi) => {
      const textIndex = 'textIndex' in g ? g.textIndex : 0;
      const passageName =
        pkg.testType === 'academic' ? `Reading Passage ${si + 1}` : section.texts.length > 1 ? 'the texts' : 'the text';
      const r = processGroup(
        g,
        `${path}.questionGroups.${gi}`,
        { module: 'reading', passageName, text: section.texts[textIndex], sectionTexts: section.texts },
        readingOut,
        issues,
        useAsset,
      );
      sectionNumbers.push(...r.numbers);
      return r.candidate;
    });
    if (sectionNumbers.length < 10 || sectionNumbers.length > 16)
      issues.error(`${path}.questionGroups`, `a reading section has 10-16 questions (got ${sectionNumbers.length})`);
    readingNumbers.push(...sectionNumbers);
    const a = sectionNumbers[0];
    const b = sectionNumbers[sectionNumbers.length - 1];
    return {
      sectionNumber: si + 1,
      intro:
        pkg.testType === 'academic'
          ? `You should spend about 20 minutes on **Questions ${a}–${b}**, which are based on Reading Passage ${si + 1} below.`
          : `Read the text${section.texts.length > 1 ? 's' : ''} below and answer **Questions ${a}–${b}**.`,
      texts: section.texts.map((t) => ({ ...t })),
      questionGroups: groups,
    };
  });
  checkModuleNumbering(readingNumbers, 'reading', issues);

  // ---- writing
  const t1 = pkg.writing.task1;
  if (pkg.testType === 'academic' && t1.kind !== 'academic_report')
    issues.error('writing.task1.kind', 'Academic Writing Task 1 is "academic_report" (describe a visual)');
  if (pkg.testType === 'general_training' && t1.kind !== 'general_letter')
    issues.error('writing.task1.kind', 'General Training Writing Task 1 is "general_letter"');
  let task1: CandidateWritingTask;
  if (t1.kind === 'academic_report') {
    const images = t1.images ?? (t1.image ? [t1.image] : []);
    images.forEach((id, i) => useAsset(id, 'image', t1.images ? `writing.task1.images.${i}` : 'writing.task1.image'));
    if (t1.visualType === 'mixed_charts' && images.length < 2)
      issues.warn('writing.task1.images', 'mixed charts are usually two or more visuals ("images")');
    task1 = {
      taskNumber: 1,
      minutes: TIMING.writingTask1Minutes,
      minWords: 150,
      image: images[0],
      images,
      body: [
        'You should spend about 20 minutes on this task.',
        `**${t1.prompt}**`,
        '**Summarise the information by selecting and reporting the main features, and make comparisons where relevant.**',
        'Write at least 150 words.',
      ].join('\n\n'),
    };
  } else {
    task1 = {
      taskNumber: 1,
      minutes: TIMING.writingTask1Minutes,
      minWords: 150,
      bulletPoints: t1.bulletPoints,
      body: [
        'You should spend about 20 minutes on this task.',
        `**${t1.situation}**`,
        `**Write a letter. In your letter**\n\n${t1.bulletPoints.map((b) => `- ${b}`).join('\n')}`,
        'Write at least 150 words.',
        'You do **NOT** need to write any addresses.',
        `Begin your letter as follows:\n\n**${t1.salutation ?? (t1.letterType === 'informal' ? 'Dear ...,' : 'Dear Sir or Madam,')}**`,
      ].join('\n\n'),
    };
  }
  const task2: CandidateWritingTask = {
    taskNumber: 2,
    minutes: TIMING.writingTask2Minutes,
    minWords: 250,
    body: [
      'You should spend about 40 minutes on this task.',
      'Write about the following topic:',
      `**${pkg.writing.task2.prompt}**`,
      `**${pkg.writing.task2.question}**`,
      'Give reasons for your answer and include any relevant examples from your own knowledge or experience.',
      'Write at least 250 words.',
    ].join('\n\n'),
  };

  // ---- speaking
  const sp = pkg.speaking;
  const spoken = (q: { text: string; audio?: string }, path: string) => {
    if (q.audio) useAsset(q.audio, 'audio', path);
    return q.audio ? { text: q.text, audio: q.audio } : { text: q.text };
  };
  const part1Count = sp.part1.topics.reduce((n, t) => n + t.questions.length, 0);
  const part3Count = sp.part3.themes.reduce((n, t) => n + t.questions.length, 0);
  if (part1Count < 6 || part1Count > 14) issues.warn('speaking.part1', `Part 1 usually has 8-12 questions (got ${part1Count})`);
  if (part3Count < 3 || part3Count > 10) issues.warn('speaking.part3', `Part 3 usually has 4-8 questions (got ${part3Count})`);
  if (sp.part2.introAudio) useAsset(sp.part2.introAudio, 'audio', 'speaking.part2.introAudio');
  const speaking: CandidateSpeaking = {
    part1: {
      topics: sp.part1.topics.map((t, ti) => ({
        topic: t.topic,
        questions: t.questions.map((q, qi) => spoken(q, `speaking.part1.topics.${ti}.questions.${qi}.audio`)),
      })),
      answerSeconds: TIMING.speakingPart1AnswerSeconds,
    },
    part2: {
      topic: sp.part2.topic,
      bulletPoints: sp.part2.bulletPoints,
      finalPrompt: sp.part2.finalPrompt,
      ...(sp.part2.introAudio ? { introAudio: sp.part2.introAudio } : {}),
      prepSeconds: TIMING.speakingPart2PrepSeconds,
      talkSeconds: TIMING.speakingPart2TalkSeconds,
      roundingOff: sp.part2.roundingOff.map((q, qi) => spoken(q, `speaking.part2.roundingOff.${qi}.audio`)),
      roundingOffSeconds: TIMING.speakingRoundingOffSeconds,
    },
    part3: {
      themes: sp.part3.themes.map((t, ti) => ({
        theme: t.theme,
        questions: t.questions.map((q, qi) => spoken(q, `speaking.part3.themes.${ti}.questions.${qi}.audio`)),
      })),
      answerSeconds: TIMING.speakingPart3AnswerSeconds,
    },
  };

  for (const id of assetById.keys()) if (!used.has(id)) issues.warn('assets', `asset "${id}" is not used and will not be stored`);

  if (issues.errors.length > 0) return { ok: false, errors: issues.errors, warnings: issues.warnings };

  const candidate: CandidateExam = {
    testType: pkg.testType,
    title: pkg.title,
    listening: { parts: listeningParts, reviewSeconds: TIMING.listeningReviewSeconds },
    reading: { sections: readingSections, minutes: TIMING.readingMinutes },
    writing: { tasks: [task1, task2], minutes: TIMING.writingMinutes },
    speaking,
  };
  const assets = [...assetById.values()].filter((a) => used.has(a.id));
  const summary: ExamSummary = {
    testType: pkg.testType,
    title: pkg.title,
    listening: {
      questions: listeningNumbers.length,
      types: countTypes(pkg.listening.parts.flatMap((p) => p.questionGroups)),
      audioSeconds: Math.round(listeningSeconds),
    },
    reading: {
      questions: readingNumbers.length,
      types: countTypes(pkg.reading.sections.flatMap((s) => s.questionGroups)),
      texts: readingTexts,
      words: readingWords,
    },
    writing: {
      task1: t1.kind === 'academic_report' ? t1.visualType : `${t1.letterType} letter`,
      task2: pkg.writing.task2.essayType,
    },
    speaking: { part1Questions: part1Count, part3Questions: part3Count },
    assets: {
      audio: assets.filter((a) => a.kind === 'audio').length,
      image: assets.filter((a) => a.kind === 'image').length,
      bytes: assetBytes,
    },
  };

  return {
    ok: true,
    exam: {
      schemaVersion: pkg.schemaVersion,
      candidate,
      answerKey,
      staff: {
        listening: pkg.listening.parts.map((p) => ({ partNumber: p.partNumber, context: p.context, transcript: p.transcript })),
        answers: staffAnswers,
        explanations,
        notes: {
          writingTask1: pkg.writing.task1.examinerNotes,
          writingTask2: pkg.writing.task2.examinerNotes,
          speaking: pkg.speaking.examinerNotes,
        },
        meta: pkg.meta,
      },
      assets,
      summary,
      warnings: issues.warnings,
    },
  };
}

export type { KeyEntry };
