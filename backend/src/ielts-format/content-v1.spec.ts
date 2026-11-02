/**
 * The "ielts-content 1.0.0" hand-off format: every structural example and
 * every one of the 46 registered question variants must convert and build,
 * and broken documents must be refused with a pointer to the field.
 * (Deep copies use JSON: under Jest, structuredClone returns objects of another realm.)
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildIeltsExam } from './build-exam';
import { adaptContentV1, isContentV1, PLACEHOLDER_ASSET_HOST } from './content-v1';
import type { BuiltExam } from './exam.types';
import { markModule } from './marking';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const FIXTURES = join(__dirname, '../../test/fixtures/content-1.0.0');
const load = (name: string): Json => JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), 'utf8'));

function convertAndBuild(doc: Json): { exam: BuiltExam; warnings: string[] } {
  const a = adaptContentV1(doc);
  if (!a.ok) throw new Error(`adapter: ${JSON.stringify(a.errors.slice(0, 10), null, 1)}`);
  const b = buildIeltsExam(a.pkg);
  if (!b.ok) throw new Error(`builder: ${JSON.stringify(b.errors.slice(0, 10), null, 1)}`);
  return { exam: b.exam, warnings: [...a.warnings, ...b.exam.warnings].map((w) => `${w.path}: ${w.message}`) };
}
function adaptErrors(doc: Json): string {
  const a = adaptContentV1(doc);
  expect(a.ok).toBe(false);
  return a.ok ? '' : a.errors.map((e) => `${e.path}: ${e.message}`).join('\n');
}

/** Puts a variant example in place of a 2-question group of the Academic example. */
function withVariant(example: Json): Json {
  const doc = load('academic-structure');
  const g = JSON.parse(JSON.stringify(example.group));
  const skill = g.variantId.split('.')[0];
  // Listening: questions 16-17 (part 2). Reading: 26-27 (section 3, one passage).
  const [holder, first] =
    skill === 'listening' ? [doc.listening.parts[1].groups, 16] : [doc.reading.sections[2].groups, 26];
  const index = holder.findIndex((x: Json) => x.items.flatMap((i: Json) => i.numbers)[0] === first);
  const old = holder[index];
  const oldItems = new Set(old.items.map((i: Json) => i.id));
  doc.answerKey = doc.answerKey.filter((k: Json) => !oldItems.has(k.itemId));
  let n = first;
  for (const item of g.items) item.numbers = item.numbers.map(() => n++);
  if (g.taskType === 'matching_headings')
    g.items.forEach((item: Json, i: number) => (item.targetRef = `reading.s3.text1.${'AB'[i]}`));
  holder[index] = g;
  doc.answerKey.push(...example.answerKey);
  return doc;
}

describe('ielts-content 1.0.0 adapter', () => {
  it('recognises the format', () => {
    expect(isContentV1(load('academic-structure'))).toBe(true);
    expect(isContentV1({ schemaVersion: '1.1' })).toBe(false);
  });

  it.each(['academic-structure', 'general-training-structure'])('converts and builds %s (4×10 listening, 40 reading)', (name) => {
    const doc = load(name);
    const { exam, warnings } = convertAndBuild(doc);
    expect(exam.summary.listening.questions).toBe(40);
    expect(exam.summary.reading.questions).toBe(40);
    expect(Object.keys(exam.answerKey.listening)).toHaveLength(40);
    expect(Object.keys(exam.answerKey.reading)).toHaveLength(40);
    expect(warnings.join('\n')).toMatch(/fixtureOnly/);
    // Nothing secret reaches the candidate view.
    const view = JSON.stringify(exam.candidate);
    expect(view).not.toMatch(/Fixture explanation|Fixture transcript|"answers?"|answerUnits|explanation/);
    // Explanations from the answer key reach the teacher.
    expect(exam.staff.explanations?.listening[1]).toMatch(/Fixture explanation/);
  });

  it('marks a "choose TWO" item 2 / 1 / 0 like the hand-off (B,D)', () => {
    const { exam } = convertAndBuild(load('academic-structure'));
    const key = exam.answerKey.listening[7];
    expect(key.kind).toBe('multi');
    const [x, y] = key.kind === 'multi' ? key.answers : [];
    const other = ['A', 'B', 'C', 'D', 'E'].find((l) => l !== x && l !== y)!;
    expect(markModule(exam.answerKey.listening, { 7: y, 8: x }).raw).toBe(2);
    expect(markModule(exam.answerKey.listening, { 7: x, 8: other }).raw).toBe(1);
    expect(markModule(exam.answerKey.listening, { 7: x }).raw).toBe(1);
    expect(markModule(exam.answerKey.listening, {}).raw).toBe(0);
  });

  const variants: Json[] = load('group-variants').examples;
  it('has the 46 registered variants', () => expect(variants).toHaveLength(46));

  it.each(variants.map((v) => [v.variantId, v]))('converts and builds variant %s', (_id, example) => {
    const { exam } = convertAndBuild(withVariant(example as Json));
    const skill = (example as Json).variantId.startsWith('listening') ? 'listening' : 'reading';
    expect(Object.keys(exam.answerKey[skill])).toHaveLength(40);
  });

  it('text_set: answers in any order, the same word twice scores once', () => {
    const example = variants.find((v) => v.variantId === 'listening.short_answer.set')!;
    const { exam } = convertAndBuild(withVariant(example));
    const key = exam.answerKey.listening;
    expect(key[16].kind).toBe('textset');
    expect(markModule(key, { 16: 'green', 17: 'blue' }).raw).toBe(2);
    expect(markModule(key, { 16: 'Blue', 17: 'green' }).raw).toBe(2);
    expect(markModule(key, { 16: 'blue', 17: 'blue' }).raw).toBe(1);
    expect(markModule(key, { 16: 'red', 17: 'blue' }).raw).toBe(1);
  });

  it('map with letters at given positions keeps item → letter only in the key', () => {
    const example = variants.find((v) => v.variantId === 'listening.label.map.location')!;
    const { exam } = convertAndBuild(withVariant(example));
    const g = exam.candidate.listening.parts[1].questionGroups.find((x) => x.type === 'map_labelling')!;
    expect(g.letterPositions).toHaveLength(5);
    expect(JSON.stringify(g)).not.toMatch(/"answer"/);
    expect(exam.answerKey.listening[16]).toEqual({ kind: 'choice', answer: 'A' });
  });

  it('flow-chart with a branch keeps boxes and arrows', () => {
    const example = JSON.parse(JSON.stringify(variants.find((v) => v.variantId === 'listening.completion.flow_chart.text')!));
    const layout = example.group.layout;
    layout.edges = [
      { from: layout.nodes[0].id, to: layout.nodes[1].id },
      { from: layout.nodes[0].id, to: layout.nodes[2].id },
    ];
    const { exam } = convertAndBuild(withVariant(example));
    const g = exam.candidate.listening.parts[1].questionGroups.find((x) => x.type === 'completion')!;
    expect((g.flow as Json).edges).toHaveLength(2);
    expect(JSON.stringify((g.flow as Json).nodes)).toMatch(/\{\{16\}\}/);
  });

  describe('refuses broken documents', () => {
    it('unknown fields and versions (strict JSON Schema)', () => {
      const doc = load('academic-structure');
      doc.tenantId = 'x';
      expect(adaptErrors(doc)).toMatch(/must NOT have additional properties "tenantId"/);
    });

    it('an item without a key, and a key of the wrong kind', () => {
      const doc = load('academic-structure');
      doc.answerKey = doc.answerKey.filter((k: Json) => k.itemId !== 'L1g1.i1');
      const k = doc.answerKey.find((x: Json) => x.itemId === 'L1g3.i1');
      Object.assign(k, { kind: 'text', accepted: ['x'] });
      delete k.acceptedOptionId;
      const errs = adaptErrors(doc);
      expect(errs).toMatch(/item "L1g1.i1" has no answerKey entry/);
      expect(errs).toMatch(/item "L1g3.i1" is choice_one but its key is text/);
    });

    it('placeholders that are missing or unknown', () => {
      const doc = load('academic-structure');
      doc.listening.parts[0].groups[0].layout.blocks[0] = 'Name: {{nope}}';
      const errs = adaptErrors(doc);
      expect(errs).toMatch(/placeholder \{\{nope\}\} is not an item/);
      expect(errs).toMatch(/item "L1g1.i1" must appear exactly once/);
    });

    it('an instruction that contradicts the word rule', () => {
      const doc = load('academic-structure');
      doc.listening.parts[0].groups[0].instructions = 'Write ONE WORD ONLY for each answer.';
      expect(adaptErrors(doc)).toMatch(/different word limit; the answers allow "NO MORE THAN TWO WORDS"/);
    });

    it('fixture media in a document that is not marked fixtureOnly', () => {
      const doc = load('academic-structure');
      doc.fixtureOnly = false;
      expect(adaptErrors(doc)).toMatch(/assets in "fixture" status can not be published/);
    });

    it('39 or 41 listening questions (after conversion)', () => {
      const doc = load('academic-structure');
      const g = doc.listening.parts[3].groups[0];
      const removed = g.items.pop();
      g.layout.blocks = g.layout.blocks.filter((b: string) => !b.includes(removed.id));
      doc.answerKey = doc.answerKey.filter((k: Json) => k.itemId !== removed.id);
      const a = adaptContentV1(doc);
      expect(a.ok).toBe(true);
      const b = a.ok ? buildIeltsExam(a.pkg) : null;
      expect(b?.ok).toBe(false);
      expect(JSON.stringify(b)).toMatch(/part 4 must have questions 31-40/);
    });

    it('headings that may be reused', () => {
      const doc = load('academic-structure');
      doc.reading.sections[0].groups[4].optionReuse = 'allowed';
      expect(adaptErrors(doc)).toMatch(/headings can not be reused/);
    });
  });

  it('resolves storageKey against ASSET_STORAGE_BASE_URL, placeholder otherwise', () => {
    const doc = load('academic-structure');
    doc.assets.forEach((a: Json) => (a.status = 'ready'));
    doc.fixtureOnly = false;
    const withBase = adaptContentV1(doc, { assetBaseUrl: 'https://media.example.com/ielts' });
    expect(withBase.ok && withBase.pkg.assets[1].url).toBe('https://media.example.com/ielts/fixtures/no-publish/listening-1.mp3');
    const without = adaptContentV1(doc);
    expect(without.ok && without.pkg.assets[1].url).toContain(PLACEHOLDER_ASSET_HOST);
    expect(without.ok && without.warnings.map((w) => w.message).join()).toMatch(/ASSET_STORAGE_BASE_URL/);
  });
});
