/**
 * Reads the "ielts-content 1.0.0" format proposed in the research hand-off
 * (docs/handoff-2026-11-02, docs/HANDOFF_UYUMU.md) and converts it into an
 * IELTS Test Package 1.1, which buildIeltsExam() then checks and builds.
 *
 * So a generator can follow either standard:
 *   - IELTS Test Package 1.1 (docs/IELTS_PACKAGE_FORMAT.md) — the main format;
 *   - ielts-content 1.0.0 — item ids, a separate answerKey, storageKey assets.
 *
 * The conversion never guesses: an unknown variant, an item without a key,
 * a key of the wrong kind, a placeholder that does not exist … is an error
 * with a JSON Pointer to the field. Pure: no I/O.
 */
import Ajv2020 from 'ajv/dist/2020';
import type { ErrorObject } from 'ajv';
import { wordLimitPhrase } from './answer-text';
import { CONTENT_V1_JSON_SCHEMA } from './content-v1.schema';
import type { BuildIssue } from './exam.types';
import { AUDIO_MIME, IMAGE_MIME, PACKAGE_SCHEMA_VERSION, type IeltsPackageInput, type WordLimit } from './package.schema';

export const CONTENT_V1_VERSION = '1.0.0';

export function isContentV1(input: unknown): boolean {
  return !!input && typeof input === 'object' && (input as { schemaVersion?: unknown }).schemaVersion === CONTENT_V1_VERSION;
}

// ---------------------------------------------------------------- input types (see the JSON Schema)

type WordRule = { mode: 'words_only' | 'number_only' | 'words_and_number' | 'words_or_number'; maxWords: number };
type Response =
  | { kind: 'choice_one'; optionIds: string[] }
  | { kind: 'choice_many'; optionIds: string[]; selectionCount: number }
  | { kind: 'judgement'; values: string[] }
  | { kind: 'text'; wordRule: WordRule }
  | { kind: 'text_set'; wordRule: WordRule; orderMatters: false };
type Item = { id: string; numbers: number[]; prompt: string; response: Response; targetRef?: string };
type Option = { id: string; label: string; text: string; sourceRef?: string };
type Layout =
  | { kind: 'list' | 'matching' }
  | { kind: 'form' | 'note' | 'summary' | 'sentence'; blocks: string[] }
  | { kind: 'table'; columns: string[]; rows: string[][] }
  | { kind: 'flow_chart'; nodes: Array<{ id: string; body: string }>; edges: Array<{ from: string; to: string }> }
  | {
      kind: 'visual';
      assetId: string;
      visualKind: 'map' | 'plan' | 'diagram' | 'pictures';
      arrangement: 'blank_targets';
      targets: Array<{ itemId: string; x: number; y: number; width: number; height: number }>;
    }
  | {
      kind: 'visual';
      assetId: string;
      visualKind: 'map' | 'plan' | 'diagram';
      arrangement: 'location_options';
      locations: Array<{ optionId: string; x: number; y: number }>;
    };
type Group = {
  id: string;
  variantId: string;
  taskType: string;
  instructions: string;
  sourceRefs: string[];
  optionReuse: 'allowed' | 'forbidden' | 'not_applicable';
  options: Option[];
  items: Item[];
  layout: Layout;
};
type Key =
  | { itemId: string; explanation: string; kind: 'choice_one'; acceptedOptionId: string }
  | { itemId: string; explanation: string; kind: 'choice_many'; acceptedOptionIds: string[] }
  | { itemId: string; explanation: string; kind: 'judgement'; value: string }
  | { itemId: string; explanation: string; kind: 'text'; accepted: string[] }
  | { itemId: string; explanation: string; kind: 'text_set'; answerUnits: Array<{ accepted: string[] }> };
type Asset =
  | { id: string; kind: 'image'; storageKey: string; mimeType: string; byteLength: number; status: 'fixture' | 'ready'; width: number; height: number }
  | { id: string; kind: 'audio'; storageKey: string; mimeType: string; byteLength: number; status: 'fixture' | 'ready'; durationMs: number };
type Passage = {
  id: string;
  title: string;
  paragraphs: Array<{ id: string; label: string; text: string }>;
  glossary: Array<{ term: string; definition: string }>;
  imageAssetIds: string[];
};
type SpeakingPrompt = { id: string; text: string; audioAssetId?: string };
type WritingTask =
  | { id: string; kind: 'academic_task1'; number: 1; prompt: string; directives: string[]; visualType: string; visualAssetIds: string[] }
  | {
      id: string;
      kind: 'general_task1';
      number: 1;
      prompt: string;
      directives: string[];
      register: 'personal' | 'semi_formal' | 'formal';
      recipient: string;
      scenario: string;
      bulletPoints: string[];
      opening: string;
      purposeTags: string[];
    }
  | { id: string; kind: 'task2'; number: 2; prompt: string; directives: string[]; essayTags: string[] };
export interface ContentV1 {
  schemaVersion: '1.0.0';
  contentId: string;
  title: string;
  testType: 'academic' | 'general_training';
  fixtureOnly: boolean;
  assets: Asset[];
  listening: {
    parts: Array<{ id: string; part: number; context: string; audioAssetId: string; groups: Group[] }>;
  };
  reading: { sections: Array<{ id: string; section: number; context: string; passages: Passage[]; groups: Group[] }> };
  writing: { tasks: WritingTask[] };
  speaking: {
    executionMode: 'live_examiner' | 'recorded_simulation';
    part1: { topics: Array<{ id: string; topic: string; prompts: SpeakingPrompt[] }> };
    part2: {
      id: string;
      topic: string;
      bulletPoints: string[];
      finalPrompt: string;
      roundingQuestions: SpeakingPrompt[];
    };
    part3: { linkedPart2Topic: string; prompts: SpeakingPrompt[] };
  };
  answerKey: Key[];
  examinerMaterials: {
    listeningTranscripts: Array<{ partId: string; text: string }>;
    writingNotes: Array<{ taskId: string; text: string }>;
    speakingNotes: string;
  };
  scoring: Record<string, string | null>;
}

// ---------------------------------------------------------------- result

export type ContentV1Result =
  | {
      ok: true;
      pkg: IeltsPackageInput;
      /** true: test data only, must never be given to students (import refuses it). */
      fixtureOnly: boolean;
      /** Assets still in "fixture" status (no real file). */
      fixtureAssets: string[];
      speakingMode: 'live_examiner' | 'recorded_simulation';
      warnings: BuildIssue[];
    }
  | { ok: false; errors: BuildIssue[]; warnings: BuildIssue[] };

export interface ContentV1Options {
  /**
   * https base URL that `assets[].storageKey` is relative to (env
   * ASSET_STORAGE_BASE_URL). Without it assets get a placeholder URL: fine
   * for checking a package, refused when importing it.
   */
  assetBaseUrl?: string;
}

// ---------------------------------------------------------------- helpers

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv'];
/** Host of the placeholder URL given to assets that can not be downloaded. */
export const PLACEHOLDER_ASSET_HOST = 'asset-not-resolved.invalid';

const LISTENING_CONTEXT: Record<string, string> = {
  social_dialogue: 'A conversation between two people set in an everyday social context',
  social_monologue: 'A monologue set in an everyday social context',
  educational_discussion: 'A conversation between up to four people set in an educational or training context',
  academic_monologue: 'A monologue on an academic subject',
};
const VISUAL_TYPE: Record<string, string> = {
  line_chart: 'line_graph',
  bar_chart: 'bar_chart',
  pie_chart: 'pie_chart',
  table: 'table',
  process: 'process_diagram',
  map: 'map',
  object_diagram: 'object_diagram',
  mixed: 'mixed_charts',
};
const ESSAY_TYPE: Record<string, string> = {
  opinion: 'opinion',
  discussion: 'discussion',
  advantages_disadvantages: 'advantages_disadvantages',
  outweigh: 'outweigh',
  positive_negative: 'positive_negative',
  cause_solution: 'cause_solution',
  cause_effect: 'cause_effect',
  problem_solution: 'problem_solution',
  multi_part: 'two_part_question',
  mixed: 'mixed',
};

let validator: ReturnType<Ajv2020['compile']> | null = null;
function schemaValidator() {
  validator ??= new Ajv2020({ allErrors: true, strict: false }).compile(CONTENT_V1_JSON_SCHEMA);
  return validator;
}

/** Ajv reports one error per failed `oneOf` branch; keep the useful ones. */
function ajvIssues(errors: ErrorObject[]): BuildIssue[] {
  const out: BuildIssue[] = [];
  const seen = new Set<string>();
  for (const e of errors) {
    if (e.keyword === 'oneOf' || e.keyword === 'if') continue;
    const extra = e.keyword === 'additionalProperties' ? ` "${(e.params as { additionalProperty: string }).additionalProperty}"` : '';
    const allowed = e.keyword === 'enum' || e.keyword === 'const' ? ` (${JSON.stringify((e.params as { allowedValues?: unknown; allowedValue?: unknown }).allowedValues ?? (e.params as { allowedValue?: unknown }).allowedValue)})` : '';
    const msg = `${e.message ?? 'invalid'}${extra}${allowed}`;
    const id = `${e.instancePath}|${msg}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ path: e.instancePath || '/', message: msg });
    if (out.length >= 100) break;
  }
  return out;
}

class Ctx {
  errors: BuildIssue[] = [];
  warnings: BuildIssue[] = [];
  error(path: string, message: string) {
    if (this.errors.length < 200) this.errors.push({ path, message });
  }
  warn(path: string, message: string) {
    if (this.warnings.length < 200) this.warnings.push({ path, message });
  }
}

/** Package-local ids allow letters, digits, "_" and "-" only: "image.map" → "image_map". */
function idMapper() {
  const map = new Map<string, string>();
  const taken = new Set<string>();
  return (raw: string) => {
    const known = map.get(raw);
    if (known) return known;
    let base = raw.replace(/[^A-Za-z0-9_-]/g, '_').replace(/^[^A-Za-z0-9]+/, '').slice(0, 60) || 'id';
    if (!/^[A-Za-z0-9]/.test(base)) base = `x${base}`;
    let id = base;
    for (let i = 2; taken.has(id); i++) id = `${base.slice(0, 57)}-${i}`;
    taken.add(id);
    map.set(raw, id);
    return id;
  };
}

function wordLimitOf(rule: WordRule): WordLimit | string {
  if (rule.maxWords > 5) return `maxWords ${rule.maxWords}: IELTS word limits go up to FIVE`;
  switch (rule.mode) {
    case 'words_only':
      return rule.maxWords > 0 ? { maxWords: rule.maxWords, allowNumber: false, numberRule: 'and_or' } : 'words_only needs maxWords ≥ 1';
    case 'number_only':
      return { maxWords: 0, allowNumber: true, numberRule: 'and_or' };
    case 'words_and_number':
      return { maxWords: rule.maxWords, allowNumber: true, numberRule: 'and_or' };
    case 'words_or_number':
      return { maxWords: rule.maxWords, allowNumber: true, numberRule: 'or' };
  }
}

/** Upper-case word-limit phrases an instruction may contain. */
const LIMIT_PHRASE = /(NO MORE THAN (ONE|TWO|THREE|FOUR|FIVE) WORDS?|ONE WORD|A NUMBER)/;

/** The instruction must state the same word limit as the machine rule. */
function checkInstructionLimit(instructions: string, limit: WordLimit, path: string, ctx: Ctx) {
  const phrase = wordLimitPhrase(limit);
  const text = instructions.replace(/\*\*/g, '').replace(/\s+/g, ' ');
  if (text.toUpperCase().includes(phrase)) return;
  if (LIMIT_PHRASE.test(text))
    ctx.error(path, `the instructions state a different word limit; the answers allow "${phrase}"`);
  else ctx.warn(path, `the instructions do not state the word limit "${phrase}"`);
}

// ---------------------------------------------------------------- main

export function adaptContentV1(input: unknown, options: ContentV1Options = {}): ContentV1Result {
  const validate = schemaValidator();
  if (!validate(input)) return { ok: false, errors: ajvIssues(validate.errors ?? []), warnings: [] };
  const doc = input as unknown as ContentV1;
  const ctx = new Ctx();
  const assetId = idMapper();
  const nodeId = idMapper();

  // ---- answer key: exactly one per objective item
  const keyByItem = new Map<string, Key>();
  doc.answerKey.forEach((k, i) => {
    if (keyByItem.has(k.itemId)) ctx.error(`/answerKey/${i}/itemId`, `item "${k.itemId}" has two keys`);
    keyByItem.set(k.itemId, k);
  });
  const usedKeys = new Set<string>();
  const keyFor = <K extends Key['kind']>(item: Item, kind: K, path: string): Extract<Key, { kind: K }> | null => {
    const k = keyByItem.get(item.id);
    if (!k) {
      ctx.error(path, `item "${item.id}" has no answerKey entry`);
      return null;
    }
    usedKeys.add(item.id);
    if (k.kind !== kind) {
      ctx.error(path, `item "${item.id}" is ${item.response.kind} but its key is ${k.kind}`);
      return null;
    }
    return k as Extract<Key, { kind: K }>;
  };

  // ---- ids used across the document
  const allIds = new Map<string, string>();
  const claim = (id: string, path: string) => {
    if (allIds.has(id)) ctx.error(path, `id "${id}" is also used at ${allIds.get(id)}`);
    else allIds.set(id, path);
  };

  // ---- assets
  const fixtureAssets: string[] = [];
  const assetKinds = new Map<string, 'audio' | 'image'>();
  let base: URL | null = null;
  if (options.assetBaseUrl) {
    try {
      base = new URL(options.assetBaseUrl.endsWith('/') ? options.assetBaseUrl : `${options.assetBaseUrl}/`);
    } catch {
      ctx.error('/assets', 'ASSET_STORAGE_BASE_URL is not a valid URL');
    }
  }
  let unresolved = 0;
  const assets: NonNullable<IeltsPackageInput['assets']> = doc.assets.map((a, i) => {
    const path = `/assets/${i}`;
    claim(a.id, path);
    assetKinds.set(a.id, a.kind);
    const allowed = (a.kind === 'audio' ? AUDIO_MIME : IMAGE_MIME) as readonly string[];
    if (!allowed.includes(a.mimeType)) ctx.error(`${path}/mimeType`, `${a.mimeType} is not supported (${allowed.join(', ')})`);
    let url: string;
    if (a.status === 'fixture') {
      fixtureAssets.push(a.id);
      url = `https://${PLACEHOLDER_ASSET_HOST}/fixture/${encodeURIComponent(a.storageKey)}`;
    } else if (/^https:\/\//.test(a.storageKey)) {
      ctx.error(`${path}/storageKey`, 'storageKey is a key in the asset store, not a URL');
      url = `https://${PLACEHOLDER_ASSET_HOST}/`;
    } else if (base) {
      url = new URL(a.storageKey.replace(/^\/+/, ''), base).toString();
    } else {
      unresolved++;
      url = `https://${PLACEHOLDER_ASSET_HOST}/${encodeURIComponent(a.storageKey)}`;
    }
    return {
      id: assetId(a.id),
      kind: a.kind,
      mimeType: a.mimeType as (typeof AUDIO_MIME)[number],
      url,
      ...(a.kind === 'audio' ? { durationSeconds: a.durationMs / 1000 } : {}),
    };
  });
  if (unresolved > 0)
    ctx.warn('/assets', `${unresolved} asset(s) can not be downloaded until ASSET_STORAGE_BASE_URL is set; the package can be checked but not imported`);
  const asset = (id: string, kind: 'audio' | 'image', path: string) => {
    const k = assetKinds.get(id);
    if (!k) ctx.error(path, `unknown asset "${id}"`);
    else if (k !== kind) ctx.error(path, `asset "${id}" is ${k}, ${kind} expected`);
    return assetId(id);
  };

  // ---- reading index: passage / paragraph ids
  const paragraphs = new Map<string, { section: number; passage: number; label: string }>();
  const passages = new Map<string, { section: number; passage: number }>();
  doc.reading.sections.forEach((s, si) =>
    s.passages.forEach((p, pi) => {
      claim(p.id, `/reading/sections/${si}/passages/${pi}`);
      passages.set(p.id, { section: si, passage: pi });
      p.paragraphs.forEach((para, ki) => {
        claim(para.id, `/reading/sections/${si}/passages/${pi}/paragraphs/${ki}`);
        paragraphs.set(para.id, { section: si, passage: pi, label: para.label });
      });
    }),
  );

  // ---- groups
  type Out = Record<string, unknown>;

  /** Options as A, B, C … (or i, ii, iii …) in their given order. */
  const keyed = (opts: Option[], alphabet: string[], path: string) => {
    if (opts.length > alphabet.length) ctx.error(path, `too many options (${opts.length})`);
    const relabel = opts.some((o, i) => o.label !== alphabet[i]);
    if (relabel)
      ctx.warn(path, `options are shown as ${alphabet[0]}–${alphabet[Math.max(0, opts.length - 1)]} (labels given: ${opts.map((o) => o.label).join(', ')})`);
    const byId = new Map(opts.map((o, i) => [o.id, alphabet[i] ?? '?']));
    return { list: opts.map((o, i) => ({ key: alphabet[i] ?? '?', text: o.text })), keyOf: (id: string) => byId.get(id) ?? '?', relabel };
  };
  const optionsOf = (g: Group, ids: string[], path: string) => {
    const byId = new Map(g.options.map((o) => [o.id, o]));
    return ids.map((id, i) => {
      const o = byId.get(id);
      if (!o) ctx.error(`${path}/${i}`, `option "${id}" is not in the group's options`);
      return o ?? { id, label: '?', text: '?' };
    });
  };
  const one = (item: Item, path: string): number => {
    if (item.numbers.length !== 1) ctx.error(`${path}/numbers`, 'this item type has exactly one question number');
    return item.numbers[0];
  };
  const groupWordLimit = (g: Group, path: string): WordLimit | null => {
    const rules = g.items.map((i) => (i.response.kind === 'text' || i.response.kind === 'text_set' ? JSON.stringify(i.response.wordRule) : null));
    if (rules.some((r) => r === null)) return null;
    if (new Set(rules).size > 1) {
      ctx.error(`${path}/items`, 'all typed answers of a group must share one word rule (as in IELTS instructions)');
      return null;
    }
    const w = wordLimitOf((g.items[0].response as { wordRule: WordRule }).wordRule);
    if (typeof w === 'string') {
      ctx.error(`${path}/items/0/response/wordRule`, w);
      return null;
    }
    checkInstructionLimit(g.instructions, w, `${path}/instructions`, ctx);
    return w;
  };
  /** Replaces {{itemId}} placeholders by {{question number}}; every item exactly once. */
  const placeholders = (g: Group, texts: string[], path: string) => {
    const numberOf = new Map(g.items.map((i) => [i.id, i.numbers[0]]));
    const seen = new Map<string, number>();
    const out = texts.map((t) =>
      t.replace(/\{\{\s*([^{}]*?)\s*\}\}/g, (_m, id: string) => {
        const n = numberOf.get(id);
        seen.set(id, (seen.get(id) ?? 0) + 1);
        if (n === undefined) {
          ctx.error(path, `placeholder {{${id}}} is not an item of this group`);
          return '';
        }
        return `{{${n}}}`;
      }),
    );
    g.items.forEach((i) => {
      const c = seen.get(i.id) ?? 0;
      if (c !== 1) ctx.error(path, `item "${i.id}" must appear exactly once as {{${i.id}}} (found ${c})`);
    });
    return out;
  };
  const textGap = (g: Group, item: Item, ip: string) => {
    const k = keyFor(item, 'text', ip);
    return { number: one(item, ip), answers: k?.accepted ?? ['?'], ...(k ? { explanation: k.explanation } : {}) };
  };
  const choiceAnswer = (item: Item, ip: string, keyOf: (id: string) => string) => {
    const k = keyFor(item, 'choice_one', ip);
    if (k && item.response.kind === 'choice_one' && !item.response.optionIds.includes(k.acceptedOptionId))
      ctx.error(ip, `the key "${k.acceptedOptionId}" is not one of the item's options`);
    return { answer: k ? keyOf(k.acceptedOptionId) : '?', ...(k ? { explanation: k.explanation } : {}) };
  };
  /** Bank of options shared by every item (matching, word banks). */
  const sharedBank = (g: Group, path: string, alphabet = LETTERS) => {
    const ids = g.options.map((o) => o.id);
    g.items.forEach((item, ii) => {
      if (item.response.kind === 'choice_one' && item.response.optionIds.join() !== ids.join())
        ctx.error(`${path}/items/${ii}/response/optionIds`, 'every item of this task must offer the whole option list, in order');
    });
    return keyed(g.options, alphabet, `${path}/options`);
  };
  const reuse = (g: Group) => g.optionReuse === 'allowed';
  /**
   * No targetRef: "Paragraph C" in the prompt, in the only text the group
   * refers to (or the only text of the section).
   */
  const impliedParagraph = (g: Group, item: Item, section?: number) => {
    const m = /^(?:paragraph|section)\s+([A-Z])\.?$/i.exec(item.prompt.trim());
    if (!m || section === undefined) return undefined;
    const refs = g.sourceRefs.map((r) => passages.get(r)).filter((r) => r && r.section === section);
    const passage =
      refs.length === 1 ? refs[0]!.passage : doc.reading.sections[section].passages.length === 1 ? 0 : undefined;
    if (passage === undefined) return undefined;
    const para = doc.reading.sections[section].passages[passage].paragraphs.find((x) => x.label === m[1].toUpperCase());
    return para ? paragraphs.get(para.id) : undefined;
  };

  const convertGroup = (g: Group, skill: 'listening' | 'reading', path: string, section?: number): Out | null => {
    claim(g.id, path);
    g.items.forEach((item, ii) => claim(item.id, `${path}/items/${ii}`));
    if (!g.variantId.startsWith(`${skill}.`)) {
      ctx.error(`${path}/variantId`, `${g.variantId} is not a ${skill} variant`);
      return null;
    }
    const base = { instructions: g.instructions };
    const items = (p = path) => g.items.map((item, ii) => ({ item, ip: `${p}/items/${ii}` }));
    const kinds = new Set(g.items.map((i) => i.response.kind));
    const kind = kinds.size === 1 ? [...kinds][0] : 'mixed';
    if (kind === 'mixed') {
      ctx.error(`${path}/items`, 'all items of a group must use the same response kind');
      return null;
    }
    const layout = g.layout;

    switch (g.taskType) {
      case 'multiple_choice': {
        if (kind === 'choice_one')
          return {
            type: 'multiple_choice',
            ...base,
            questions: items().map(({ item, ip }) => {
              const opts = keyed(optionsOf(g, (item.response as { optionIds: string[] }).optionIds, `${ip}/response/optionIds`), LETTERS, `${ip}/response/optionIds`);
              return { number: one(item, ip), stem: item.prompt, options: opts.list, ...choiceAnswer(item, ip, opts.keyOf) };
            }),
          };
        if (kind === 'choice_many')
          return {
            type: 'multiple_choice_multi',
            ...base,
            items: items().map(({ item, ip }) => {
              const r = item.response as Extract<Response, { kind: 'choice_many' }>;
              if (r.selectionCount !== item.numbers.length)
                ctx.error(`${ip}/response/selectionCount`, `choose ${r.selectionCount} needs ${r.selectionCount} question numbers (has ${item.numbers.length})`);
              const opts = keyed(optionsOf(g, r.optionIds, `${ip}/response/optionIds`), LETTERS, `${ip}/response/optionIds`);
              const k = keyFor(item, 'choice_many', ip);
              k?.acceptedOptionIds.forEach((id) => {
                if (!r.optionIds.includes(id)) ctx.error(ip, `the key "${id}" is not one of the item's options`);
              });
              return {
                numbers: item.numbers,
                stem: item.prompt,
                options: opts.list,
                answers: k ? k.acceptedOptionIds.map(opts.keyOf) : ['?'],
                ...(k ? { explanation: k.explanation } : {}),
              };
            }),
          };
        break;
      }

      case 'information_tfng':
      case 'writer_ynng': {
        if (kind !== 'judgement') break;
        const values = g.taskType === 'information_tfng' ? ['TRUE', 'FALSE', 'NOT_GIVEN'] : ['YES', 'NO', 'NOT_GIVEN'];
        return {
          type: g.taskType === 'information_tfng' ? 'true_false_not_given' : 'yes_no_not_given',
          ...base,
          questions: items().map(({ item, ip }) => {
            const r = item.response as Extract<Response, { kind: 'judgement' }>;
            if (r.values.join() !== values.join()) ctx.error(`${ip}/response/values`, `${g.taskType} answers are ${values.join(' / ')}`);
            const k = keyFor(item, 'judgement', ip);
            if (k && !values.includes(k.value)) ctx.error(ip, `key "${k.value}" is not one of ${values.join(' / ')}`);
            return { number: one(item, ip), statement: item.prompt, answer: k?.value ?? 'NOT_GIVEN', ...(k ? { explanation: k.explanation } : {}) };
          }),
        };
      }

      case 'matching_headings': {
        if (kind !== 'choice_one' || skill !== 'reading') break;
        const bank = sharedBank(g, path, ROMAN);
        const where = new Set<number>();
        const questions = items().map(({ item, ip }) => {
          const target = item.targetRef ? paragraphs.get(item.targetRef) : impliedParagraph(g, item, section);
          if (!target)
            ctx.error(`${ip}/targetRef`, 'give targetRef: the id of the paragraph this heading is for (in this section)');
          else {
            if (target.section !== section) ctx.error(`${ip}/targetRef`, 'the paragraph is in another reading section');
            where.add(target.passage);
          }
          return { number: one(item, ip), paragraph: target?.label ?? '?', ...choiceAnswer(item, ip, bank.keyOf) };
        });
        if (where.size > 1) ctx.error(`${path}/items`, 'all headings of a task must be for paragraphs of the same text');
        if (g.optionReuse !== 'forbidden') ctx.error(`${path}/optionReuse`, 'headings can not be reused: optionReuse must be "forbidden"');
        return { type: 'matching_headings', ...base, textIndex: [...where][0] ?? 0, headings: bank.list, questions };
      }

      case 'matching_information': {
        if (kind !== 'choice_one' || skill !== 'reading') break;
        const refs = g.options.map((o) => (o.sourceRef ? paragraphs.get(o.sourceRef) : undefined));
        const samePassage =
          refs.every((r) => r && r.section === section) && new Set(refs.map((r) => r!.passage)).size === 1;
        if (samePassage) {
          // Options are paragraphs of one text: the answer is the paragraph letter.
          sharedBank(g, path);
          const labelOf = new Map(g.options.map((o, i) => [o.id, refs[i]!.label]));
          return {
            type: 'matching_information',
            ...base,
            scope: 'paragraphs',
            textIndex: refs[0]!.passage,
            allowReuse: reuse(g),
            questions: items().map(({ item, ip }) => ({
              number: one(item, ip),
              statement: item.prompt,
              ...choiceAnswer(item, ip, (id) => labelOf.get(id) ?? '?'),
            })),
          };
        }
        // Options name texts or anything else: a list of options to match.
        const bank = sharedBank(g, path);
        return {
          type: 'matching_features',
          ...base,
          options: bank.list,
          allowReuse: reuse(g),
          questions: items().map(({ item, ip }) => ({ number: one(item, ip), statement: item.prompt, ...choiceAnswer(item, ip, bank.keyOf) })),
        };
      }

      case 'matching':
      case 'matching_features': {
        if (kind !== 'choice_one') break;
        const bank = sharedBank(g, path);
        return {
          type: 'matching_features',
          ...base,
          options: bank.list,
          allowReuse: reuse(g),
          questions: items().map(({ item, ip }) => ({ number: one(item, ip), statement: item.prompt, ...choiceAnswer(item, ip, bank.keyOf) })),
        };
      }

      case 'matching_endings': {
        if (kind !== 'choice_one' || skill !== 'reading') break;
        const bank = sharedBank(g, path);
        return {
          type: 'matching_sentence_endings',
          ...base,
          endings: bank.list,
          questions: items().map(({ item, ip }) => ({ number: one(item, ip), sentenceStart: item.prompt, ...choiceAnswer(item, ip, bank.keyOf) })),
        };
      }

      case 'completion':
      case 'sentence_completion': {
        if (kind !== 'text' && kind !== 'choice_one') break;
        const select = kind === 'choice_one';
        const wordLimit = select ? null : groupWordLimit(g, path);
        const bank = select ? sharedBank(g, path) : null;
        const gaps = items().map(({ item, ip }) =>
          select ? { number: one(item, ip), ...choiceAnswer(item, ip, bank!.keyOf) } : textGap(g, item, ip),
        );
        const common = {
          ...base,
          answerMode: select ? 'select' : 'write',
          ...(wordLimit ? { wordLimit } : {}),
          ...(bank ? { options: bank.list } : {}),
          gaps,
        };
        if (layout.kind === 'sentence') {
          const blocks = placeholders(g, layout.blocks, `${path}/layout/blocks`);
          const single = blocks.every((b) => (b.match(/\{\{\d+\}\}/g) ?? []).length <= 1);
          if (!select && single && blocks.filter((b) => /\{\{\d+\}\}/.test(b)).length === gaps.length)
            return {
              type: 'sentence_completion',
              ...base,
              wordLimit: wordLimit ?? undefined,
              questions: blocks
                .filter((b) => /\{\{\d+\}\}/.test(b))
                .map((sentence) => {
                  const n = Number(/\{\{(\d+)\}\}/.exec(sentence)![1]);
                  const gap = gaps.find((x) => x.number === n) as { number: number; answers: string[]; explanation?: string };
                  return { number: n, sentence, answers: gap.answers, ...(gap.explanation ? { explanation: gap.explanation } : {}) };
                }),
            };
          ctx.warn(`${path}/layout`, 'shown as a summary: the sentences have several gaps or use a word bank');
          return { type: 'completion', variant: 'summary', ...common, lines: blocks.map((text) => ({ text })) };
        }
        if (layout.kind === 'form' || layout.kind === 'note' || layout.kind === 'summary') {
          if (layout.kind === 'form' && skill === 'reading') ctx.error(`${path}/layout/kind`, 'form completion is a listening task');
          const blocks = placeholders(g, layout.blocks, `${path}/layout/blocks`);
          return { type: 'completion', variant: layout.kind, ...common, lines: blocks.map((text) => ({ text })) };
        }
        if (layout.kind === 'table') {
          const cells = placeholders(g, [...layout.columns, ...layout.rows.flat()], `${path}/layout`);
          const head = cells.slice(0, layout.columns.length);
          let at = head.length;
          const body = layout.rows.map((r) => cells.slice(at, (at += r.length)));
          return { type: 'completion', variant: 'table', ...common, table: { columns: head, rows: body } };
        }
        if (layout.kind === 'flow_chart') {
          const texts = placeholders(g, layout.nodes.map((n) => n.body), `${path}/layout/nodes`);
          const ids = layout.nodes.map((n) => n.id);
          const chain =
            layout.edges.length === ids.length - 1 && layout.edges.every((e, i) => e.from === ids[i] && e.to === ids[i + 1]);
          if (chain) return { type: 'completion', variant: 'flow_chart', ...common, steps: texts };
          return {
            type: 'completion',
            variant: 'flow_chart',
            ...common,
            flow: {
              nodes: layout.nodes.map((n, i) => ({ id: nodeId(`${g.id}/${n.id}`), text: texts[i] })),
              edges: layout.edges.map((e) => ({ from: nodeId(`${g.id}/${e.from}`), to: nodeId(`${g.id}/${e.to}`) })),
            },
          };
        }
        break;
      }

      case 'visual_labelling': {
        if (layout.kind !== 'visual') break;
        const image = asset(layout.assetId, 'image', `${path}/layout/assetId`);
        if (layout.arrangement === 'location_options') {
          if (kind !== 'choice_one') break;
          const bank = sharedBank(g, path);
          const where = new Map(layout.locations.map((l) => [l.optionId, l]));
          g.options.forEach((o) => {
            if (!where.has(o.id)) ctx.error(`${path}/layout/locations`, `option "${o.id}" has no location on the image`);
          });
          return {
            type: 'map_labelling',
            ...base,
            visualKind: layout.visualKind,
            image,
            letters: bank.list.map((o) => o.key),
            letterPositions: g.options.map((o, i) => {
              const l = where.get(o.id);
              return { key: bank.list[i].key, x: (l?.x ?? 0) * 100, y: (l?.y ?? 0) * 100 };
            }),
            questions: items().map(({ item, ip }) => ({ number: one(item, ip), label: item.prompt, ...choiceAnswer(item, ip, bank.keyOf) })),
          };
        }
        if (kind !== 'text' && kind !== 'choice_one') break;
        const select = kind === 'choice_one';
        const wordLimit = select ? null : groupWordLimit(g, path);
        const bank = select ? sharedBank(g, path) : null;
        const target = new Map(layout.targets.map((t) => [t.itemId, t]));
        layout.targets.forEach((t, i) => {
          if (!g.items.some((it) => it.id === t.itemId)) ctx.error(`${path}/layout/targets/${i}`, `"${t.itemId}" is not an item of this group`);
          if (t.x + t.width > 1 || t.y + t.height > 1) ctx.error(`${path}/layout/targets/${i}`, 'the box goes outside the image');
        });
        return {
          type: 'diagram_label_completion',
          ...base,
          visualKind: layout.visualKind,
          image,
          answerMode: select ? 'select' : 'write',
          ...(wordLimit ? { wordLimit } : {}),
          ...(bank ? { options: bank.list } : {}),
          labels: items().map(({ item, ip }) => {
            const t = target.get(item.id);
            if (!t) ctx.error(ip, `item "${item.id}" has no target on the image`);
            const pos = { x: ((t?.x ?? 0) + (t?.width ?? 0) / 2) * 100, y: ((t?.y ?? 0) + (t?.height ?? 0) / 2) * 100 };
            if (select) return { number: one(item, ip), ...pos, ...choiceAnswer(item, ip, bank!.keyOf) };
            const gap = textGap(g, item, ip);
            return { ...pos, ...gap };
          }),
        };
      }

      case 'short_answer': {
        if (kind !== 'text' && kind !== 'text_set') break;
        const wordLimit = groupWordLimit(g, path);
        return {
          type: 'short_answer',
          ...base,
          wordLimit: wordLimit ?? { maxWords: 1, allowNumber: false },
          questions: items().map(({ item, ip }) => {
            if (item.response.kind === 'text') {
              const gap = textGap(g, item, ip);
              return { ...gap, question: item.prompt };
            }
            const k = keyFor(item, 'text_set', ip);
            if (k && k.answerUnits.length !== item.numbers.length)
              ctx.error(ip, `${item.numbers.length} question numbers need ${item.numbers.length} answer units`);
            return {
              numbers: item.numbers,
              question: item.prompt,
              answerUnits: k ? k.answerUnits.map((u) => u.accepted) : [['?'], ['?']],
              ...(k ? { explanation: k.explanation } : {}),
            };
          }),
        };
      }
    }
    ctx.error(path, `${g.variantId} (${g.taskType}, ${kind}, layout ${layout.kind}) is not a supported combination`);
    return null;
  };

  // ---- listening
  const transcripts = new Map(doc.examinerMaterials.listeningTranscripts.map((t) => [t.partId, t.text]));
  const listeningParts = doc.listening.parts.map((p, pi) => {
    const path = `/listening/parts/${pi}`;
    claim(p.id, path);
    const transcript = transcripts.get(p.id);
    if (!transcript) ctx.error('/examinerMaterials/listeningTranscripts', `no transcript for part "${p.id}"`);
    return {
      partNumber: p.part,
      context: LISTENING_CONTEXT[p.context] ?? p.context,
      audio: asset(p.audioAssetId, 'audio', `${path}/audioAssetId`),
      transcript: transcript ?? '-',
      questionGroups: p.groups.map((g, gi) => convertGroup(g, 'listening', `${path}/groups/${gi}`)).filter(Boolean),
    };
  });

  // ---- reading
  const readingSections = doc.reading.sections.map((s, si) => {
    const path = `/reading/sections/${si}`;
    claim(s.id, path);
    return {
      sectionNumber: s.section,
      texts: s.passages.map((p, pi) => {
        const pp = `${path}/passages/${pi}`;
        const labels = p.paragraphs.map((x) => x.label);
        const letterLabels = labels.every((l, i) => l === LETTERS[i]);
        if (!letterLabels) ctx.warn(`${pp}/paragraphs`, 'paragraph labels are not A, B, C …: they are not shown');
        if (p.imageAssetIds.length > 1) ctx.warn(`${pp}/imageAssetIds`, 'only the first image of a passage is shown');
        return {
          title: p.title,
          paragraphs: p.paragraphs.map((x) => ({ ...(letterLabels ? { label: x.label } : {}), text: x.text })),
          ...(p.imageAssetIds[0] ? { image: asset(p.imageAssetIds[0], 'image', `${pp}/imageAssetIds/0`) } : {}),
          ...(p.glossary.length ? { glossary: p.glossary } : {}),
        };
      }),
      questionGroups: s.groups.map((g, gi) => convertGroup(g, 'reading', `${path}/groups/${gi}`, si)).filter(Boolean),
    };
  });

  // ---- writing
  const notes = new Map(doc.examinerMaterials.writingNotes.map((n) => [n.taskId, n.text]));
  const t1 = doc.writing.tasks.find((t) => t.number === 1) as WritingTask | undefined;
  const t2 = doc.writing.tasks.find((t) => t.number === 2) as Extract<WritingTask, { kind: 'task2' }> | undefined;
  if (!t1 || !t2 || t1.kind === 'task2' || t2.kind !== 'task2') ctx.error('/writing/tasks', 'give Task 1 (number 1) and Task 2 (number 2)');
  let task1: Record<string, unknown> = {};
  if (t1?.kind === 'academic_task1') {
    const images = t1.visualAssetIds.map((id, i) => asset(id, 'image', `/writing/tasks/0/visualAssetIds/${i}`));
    if (images.length > 3) ctx.error('/writing/tasks/0/visualAssetIds', 'at most three visuals');
    task1 = {
      kind: 'academic_report',
      visualType: VISUAL_TYPE[t1.visualType] ?? t1.visualType,
      prompt: t1.prompt,
      ...(images.length === 1 ? { image: images[0] } : { images }),
      ...(notes.get(t1.id) ? { examinerNotes: notes.get(t1.id) } : {}),
    };
  } else if (t1?.kind === 'general_task1') {
    task1 = {
      kind: 'general_letter',
      letterType: t1.register === 'personal' ? 'informal' : t1.register,
      situation: t1.scenario,
      bulletPoints: t1.bulletPoints,
      salutation: t1.opening,
      examinerNotes: [`Recipient: ${t1.recipient}`, `Purpose: ${t1.purposeTags.join(', ')}`, `Task: ${t1.prompt}`, notes.get(t1.id)]
        .filter(Boolean)
        .join('\n'),
    };
  }
  const essayTags = t2?.essayTags ?? [];
  const task2 = t2
    ? {
        essayType: essayTags.length === 1 ? (ESSAY_TYPE[essayTags[0]] ?? 'mixed') : 'mixed',
        prompt: t2.prompt,
        question: t2.directives.join(' '),
        ...(notes.get(t2.id) ? { examinerNotes: notes.get(t2.id) } : {}),
      }
    : {};

  // ---- speaking
  const sp = doc.speaking;
  const spoken = (q: SpeakingPrompt, path: string) => {
    claim(q.id, path);
    return { text: q.text, ...(q.audioAssetId ? { audio: asset(q.audioAssetId, 'audio', `${path}/audioAssetId`) } : {}) };
  };
  if (sp.part2.bulletPoints.length < 3 || sp.part2.bulletPoints.length > 4)
    ctx.error('/speaking/part2/bulletPoints', 'an IELTS cue card has 3 or 4 points ("You should say:")');
  if (sp.executionMode === 'live_examiner')
    ctx.warn('/speaking/executionMode', 'live_examiner: choose "Speaking face to face with the teacher" when assigning the test');
  const speaking = {
    part1: {
      topics: sp.part1.topics.map((t, ti) => ({
        topic: t.topic,
        questions: t.prompts.map((q, qi) => spoken(q, `/speaking/part1/topics/${ti}/prompts/${qi}`)),
      })),
    },
    part2: {
      topic: sp.part2.topic,
      bulletPoints: sp.part2.bulletPoints,
      finalPrompt: sp.part2.finalPrompt,
      roundingOff: sp.part2.roundingQuestions.map((q, qi) => spoken(q, `/speaking/part2/roundingQuestions/${qi}`)),
    },
    part3: {
      themes: [
        {
          theme: sp.part3.linkedPart2Topic,
          questions: sp.part3.prompts.map((q, qi) => spoken(q, `/speaking/part3/prompts/${qi}`)),
        },
      ],
    },
    examinerNotes: doc.examinerMaterials.speakingNotes,
  };

  doc.answerKey.forEach((k, i) => {
    if (!usedKeys.has(k.itemId) && !allIds.has(k.itemId)) ctx.error(`/answerKey/${i}/itemId`, `"${k.itemId}" is not an item of this test`);
  });
  if (doc.fixtureOnly) ctx.warn('/fixtureOnly', 'test data only (fixtureOnly): it can be checked but never imported or given to students');
  else if (fixtureAssets.length)
    ctx.error('/assets', `assets in "fixture" status can not be published: ${fixtureAssets.join(', ')}`);

  if (ctx.errors.length) return { ok: false, errors: ctx.errors, warnings: ctx.warnings };

  const pkg = {
    schemaVersion: PACKAGE_SCHEMA_VERSION,
    testType: doc.testType,
    title: doc.title,
    meta: { source: `ielts-content ${CONTENT_V1_VERSION}`, contentId: doc.contentId, scoring: doc.scoring },
    assets,
    listening: { parts: listeningParts },
    reading: { sections: readingSections },
    writing: { task1, task2 },
    speaking,
  } as unknown as IeltsPackageInput;
  return {
    ok: true,
    pkg,
    fixtureOnly: doc.fixtureOnly,
    fixtureAssets,
    speakingMode: sp.executionMode,
    warnings: ctx.warnings,
  };
}
