import { countWords, expandAccepted, isTextAnswerCorrect, normalizeAnswer, wordLimitPhrase, withinWordLimit } from './answer-text';
import { listeningBand, overallBand, readingBand, roundToHalfBand, speakingBand, writingBand } from './band';
import { buildIeltsExam } from './build-exam';
import type { BuiltExam } from './exam.types';
import { markModule } from './marking';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { makeSamplePackage } = require('../../samples/sample-package.js');

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function build(mutate?: (p: Json) => void) {
  const pkg = makeSamplePackage();
  mutate?.(pkg);
  return buildIeltsExam(pkg);
}
function built(): BuiltExam {
  const r = build();
  if (!r.ok) throw new Error(JSON.stringify(r.errors, null, 2));
  return r.exam;
}
function errorsOf(mutate: (p: Json) => void) {
  const r = build(mutate);
  expect(r.ok).toBe(false);
  return r.ok ? [] : r.errors.map((e) => `${e.path}: ${e.message}`);
}

describe('typed answers', () => {
  it('words the limit like IELTS', () => {
    expect(wordLimitPhrase({ maxWords: 1, allowNumber: false })).toBe('ONE WORD ONLY');
    expect(wordLimitPhrase({ maxWords: 1, allowNumber: true })).toBe('ONE WORD AND/OR A NUMBER');
    expect(wordLimitPhrase({ maxWords: 2, allowNumber: true })).toBe('NO MORE THAN TWO WORDS AND/OR A NUMBER');
    expect(wordLimitPhrase({ maxWords: 3, allowNumber: false })).toBe('NO MORE THAN THREE WORDS');
    expect(wordLimitPhrase({ maxWords: 0, allowNumber: true })).toBe('A NUMBER');
  });

  it('normalises case, spaces, punctuation, numbers and times', () => {
    expect(normalizeAnswer('  The   Library. ')).toBe('the library');
    expect(normalizeAnswer('£1,500')).toBe('1500');
    expect(normalizeAnswer('7:30')).toBe('7.30');
    expect(normalizeAnswer('Côte d’Ivoire')).toBe("côte d'ivoire");
    expect(normalizeAnswer('well – known')).toBe('well-known');
  });

  it('expands optional words', () => {
    expect(expandAccepted('(the) old (city) library').sort()).toEqual(
      ['old city library', 'old library', 'the old city library', 'the old library'].sort(),
    );
  });

  it('counts words and numbers the IELTS way', () => {
    expect(countWords('42 Mill Road')).toEqual({ words: 2, numbers: 1 });
    expect(countWords('well-known')).toEqual({ words: 1, numbers: 0 });
    expect(countWords('7.30 pm')).toEqual({ words: 0, numbers: 1 });
    expect(withinWordLimit('3 large rooms', { maxWords: 2, allowNumber: true })).toBe(true);
    expect(withinWordLimit('3 4 rooms', { maxWords: 2, allowNumber: true })).toBe(false);
    expect(withinWordLimit('15', { maxWords: 1, allowNumber: false })).toBe(true);
    expect(withinWordLimit('the sauna', { maxWords: 1, allowNumber: true })).toBe(false);
  });

  it('marks wrong when the word limit is broken, even with the key inside', () => {
    const limit = { maxWords: 1, allowNumber: false };
    expect(isTextAnswerCorrect('Sauna', ['(the) sauna'], limit)).toBe(true);
    expect(isTextAnswerCorrect('the sauna', ['(the) sauna'], limit)).toBe(false);
    expect(isTextAnswerCorrect('sauna room', ['sauna'], limit)).toBe(false);
    expect(isTextAnswerCorrect('suana', ['sauna'], limit)).toBe(false);
    expect(isTextAnswerCorrect('', ['sauna'], limit)).toBe(false);
  });
});

describe('band scores', () => {
  it('converts raw scores', () => {
    expect(listeningBand(40)).toBe(9);
    expect(listeningBand(30)).toBe(7);
    expect(listeningBand(23)).toBe(6);
    expect(listeningBand(0)).toBe(0);
    expect(readingBand(30, 'academic')).toBe(7);
    expect(readingBand(30, 'general_training')).toBe(6);
    expect(readingBand(39, 'general_training')).toBe(8.5);
    expect(() => listeningBand(41)).toThrow();
  });

  it('rounds the overall band like IELTS', () => {
    expect(roundToHalfBand(6.25)).toBe(6.5);
    expect(roundToHalfBand(6.75)).toBe(7);
    expect(roundToHalfBand(6.125)).toBe(6);
    expect(roundToHalfBand(6.625)).toBe(6.5);
    expect(overallBand({ listening: 6.5, reading: 6.5, writing: 5, speaking: 7 })).toBe(6.5); // 6.25
    expect(overallBand({ listening: 4, reading: 3.5, writing: 4, speaking: 4 })).toBe(4); // 3.875
  });

  it('weights Writing Task 2 double', () => {
    const t1 = { ta: 5, cc: 5, lr: 5, gra: 5 };
    const t2 = { ta: 7, cc: 7, lr: 7, gra: 7 };
    expect(writingBand(t1, t2)).toBe(6.5); // 6.33
    expect(speakingBand({ fc: 6, lr: 6, gra: 7, p: 6 })).toBe(6.5); // 6.25
  });
});

describe('buildIeltsExam — sample package', () => {
  const exam = built();

  it('builds a complete Academic test', () => {
    expect(exam.summary.listening.questions).toBe(40);
    expect(exam.summary.reading.questions).toBe(40);
    expect(exam.candidate.listening.parts).toHaveLength(4);
    expect(exam.candidate.reading.sections).toHaveLength(3);
    expect(exam.candidate.writing.tasks.map((t) => t.minWords)).toEqual([150, 250]);
    expect(Object.keys(exam.answerKey.listening)).toHaveLength(40);
    expect(Object.keys(exam.answerKey.reading)).toHaveLength(40);
    expect(exam.assets).toHaveLength(7);
  });

  it('uses every IELTS question type', () => {
    const types = new Set([...Object.keys(exam.summary.listening.types), ...Object.keys(exam.summary.reading.types)]);
    expect([...types].sort()).toEqual(
      [
        'completion',
        'diagram_label_completion',
        'map_labelling',
        'matching_features',
        'matching_headings',
        'matching_information',
        'matching_sentence_endings',
        'multiple_choice',
        'multiple_choice_multi',
        'sentence_completion',
        'short_answer',
        'true_false_not_given',
        'yes_no_not_given',
      ].sort(),
    );
  });

  it('never leaks answers or transcripts to candidates', () => {
    const json = JSON.stringify(exam.candidate);
    expect(json).not.toMatch(/"answers?"\s*:/);
    expect(json).not.toContain('transcript');
    expect(json).not.toContain('Fletcher');
    expect(json).not.toContain('targetBand');
  });

  it('adds the standard IELTS wording', () => {
    const p1 = exam.candidate.listening.parts[0];
    expect(p1.intro).toBe('Listen and answer questions 1–10.');
    expect(p1.questionGroups[0].instructions).toContain('ONE WORD AND/OR A NUMBER');
    expect(p1.questionGroups[0].range).toEqual([1, 5]);
    const r1 = exam.candidate.reading.sections[0];
    expect(r1.intro).toContain('Questions 1–13');
    expect(r1.questionGroups[0].instructions).toContain('Reading Passage 1');
    expect(r1.questionGroups[1].instructions).toContain('from the passage');
    const headings = exam.candidate.reading.sections[1].questionGroups[0];
    expect(headings.instructions).toContain('has 7 paragraphs, **A–G**');
    expect(exam.candidate.writing.tasks[0].body).toContain('Write at least 150 words.');
  });

  it('keeps a readable key for teachers', () => {
    expect(exam.staff.answers.listening[1]).toBe('Fletcher');
    expect(exam.staff.answers.listening[19]).toBe('B, D (in either order)');
    expect(exam.staff.answers.reading[4]).toBe('NOT GIVEN');
    expect(exam.staff.listening[0].transcript).toContain('Fletcher');
  });
});

describe('buildIeltsExam — rejects packages that are not IELTS shaped', () => {
  it('reports schema errors with paths', () => {
    const errs = errorsOf((p) => {
      p.listening.parts.pop();
    });
    expect(errs.join('\n')).toMatch(/listening\.parts/);
  });

  it('needs 10 questions per listening part numbered 1-40', () => {
    const errs = errorsOf((p) => {
      p.listening.parts[0].questionGroups[1].gaps.pop();
      p.listening.parts[0].questionGroups[1].table.rows[2][2] = 'lasts 45 minutes';
    });
    expect(errs.join('\n')).toMatch(/part 1 must have questions 1-10/);
  });

  it('refuses reading-only types in listening', () => {
    const errs = errorsOf((p) => {
      p.listening.parts[1].questionGroups[0] = {
        type: 'true_false_not_given',
        questions: [11, 12, 13].map((n) => ({ number: n, statement: 'x', answer: 'TRUE' })),
      };
    });
    expect(errs.join('\n')).toMatch(/not an IELTS listening question type/);
  });

  it('checks gaps against the content', () => {
    const errs = errorsOf((p) => {
      p.listening.parts[0].questionGroups[0].lines[0].text = 'Surname: {{9}}';
    });
    expect(errs.join('\n')).toMatch(/gaps in the content/);
  });

  it('checks that accepted answers respect the word limit', () => {
    const errs = errorsOf((p) => {
      p.listening.parts[2].questionGroups[2].questions[0].answers = ['local residents'];
    });
    expect(errs.join('\n')).toMatch(/breaks the word limit \(ONE WORD ONLY\)/);
  });

  it('checks answers against options, headings and paragraphs', () => {
    const errs = errorsOf((p) => {
      p.listening.parts[1].questionGroups[0].questions[0].answer = 'D';
      p.reading.sections[1].questionGroups[0].questions[0].answer = 'iii';
      p.reading.sections[1].questionGroups[0].questions[1].answer = 'iii';
      p.reading.sections[1].questionGroups[1].questions[0].answer = 'H';
    });
    const all = errs.join('\n');
    expect(all).toMatch(/answer D is not an option/);
    expect(all).toMatch(/heading iii is the answer twice/);
    expect(all).toMatch(/no paragraph H/);
  });

  it('checks asset references and real file types', () => {
    const errs = errorsOf((p) => {
      p.listening.parts[0].audio = 'missing';
      p.assets[4].mimeType = 'image/png';
      p.writing.task1.image = 'listening-part-2';
    });
    const all = errs.join('\n');
    expect(all).toMatch(/unknown asset "missing"/);
    expect(all).toMatch(/file content is image\/svg\+xml, declared image\/png/);
    expect(all).toMatch(/asset "listening-part-2" is audio, image expected/);
  });

  it('refuses SVG with scripts', () => {
    const errs = errorsOf((p) => {
      p.assets[4].data = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString('base64');
    });
    expect(errs.join('\n')).toMatch(/active content/);
  });

  it('enforces the General Training structure', () => {
    const errs = errorsOf((p) => {
      p.testType = 'general_training';
      p.reading.sections[2].texts.push(p.reading.sections[2].texts[0]);
    });
    const all = errs.join('\n');
    expect(all).toMatch(/General Training section 3 has 1 text/);
    expect(all).toMatch(/general_letter/);
  });

  it('accepts a General Training package', () => {
    const r = build((p) => {
      p.testType = 'general_training';
      const [s1, s2] = p.reading.sections;
      const half = (t: Json) => ({ ...t, paragraphs: t.paragraphs.slice(0, 3) });
      s1.texts = [half(s1.texts[0]), { title: 'Second notice', paragraphs: [{ text: 'Short notice text.' }] }];
      s2.texts = [s2.texts[0], { title: 'Staff handbook', paragraphs: [{ text: 'Workplace text.' }] }];
      p.writing.task1 = {
        kind: 'general_letter',
        letterType: 'formal',
        situation: 'You recently bought a kettle that does not work.',
        bulletPoints: ['describe the problem', 'say what you did', 'say what you want the shop to do'],
      };
      p.assets = p.assets.filter((a: Json) => a.id !== 'commuter-chart');
    });
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    expect(r.exam.candidate.reading.sections[0].intro).toBe('Read the texts below and answer **Questions 1–13**.');
    expect(r.exam.candidate.writing.tasks[0].body).toContain('- describe the problem');
    expect(r.exam.candidate.writing.tasks[0].body).toContain('Dear Sir or Madam,');
  });
});

describe('marking', () => {
  const exam = built();

  it('gives 40/40 for the key and 0 for nothing', () => {
    const perfect: Record<string, string> = {};
    for (const [n, e] of Object.entries(exam.answerKey.listening)) {
      if (e.kind === 'choice') perfect[n] = e.answer;
      else if (e.kind === 'text') perfect[n] = expandAccepted(e.answers[0])[0];
      else if (e.kind === 'textset') perfect[n] = expandAccepted(e.units[e.numbers.indexOf(Number(n))][0])[0];
      else perfect[n] = e.answers[e.numbers.indexOf(Number(n))];
    }
    expect(markModule(exam.answerKey.listening, perfect).raw).toBe(40);
    expect(markModule(exam.answerKey.listening, {}).raw).toBe(0);
  });

  it('marks "choose TWO" in either order, one mark per correct letter', () => {
    const key = exam.answerKey.listening;
    expect(markModule(key, { 19: 'D', 20: 'B' }).correct).toMatchObject({ 19: true, 20: true });
    expect(markModule(key, { 19: 'D', 20: 'A' }).correct).toMatchObject({ 19: true, 20: false });
    expect(markModule(key, { 19: 'D', 20: 'D' }).raw).toBe(1);
  });

  it('accepts alternatives and case, rejects misspellings', () => {
    const key = exam.answerKey.listening;
    const m = markModule(key, { 1: 'FLETCHER', 4: 'third', 32: 'chili', 39: 'ivory coast', 40: 'plant disease', 2: '4 2' });
    expect(m.correct).toMatchObject({ 1: true, 4: true, 32: true, 39: true, 40: true, 2: false });
    expect(markModule(exam.answerKey.reading, { 4: 'NOT_GIVEN', 5: 'true', 14: 'vii' }).raw).toBe(3);
  });
});

// ---------------------------------------------------------------- format 1.1

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { makeGeneralSamplePackage } = require('../../samples/general-sample-package.js');

describe('format 1.1 (General Training sample)', () => {
  const gtBuild = (mutate?: (p: Json) => void) => {
    const pkg = makeGeneralSamplePackage();
    mutate?.(pkg);
    return buildIeltsExam(pkg);
  };
  const gtErrors = (mutate: (p: Json) => void) => {
    const r = gtBuild(mutate);
    expect(r.ok).toBe(false);
    return r.ok ? '' : r.errors.map((e) => `${e.path}: ${e.message}`).join('\n');
  };
  const r = gtBuild();
  if (!r.ok) throw new Error(JSON.stringify(r.errors, null, 2));
  const exam = r.exam;

  it('builds, 1.0 packages still build', () => {
    expect(exam.schemaVersion).toBe('1.1');
    expect(exam.summary.reading.texts).toBe(7);
    expect(built().schemaVersion).toBe('1.0');
  });

  it('keeps answers, explanations and examiner notes out of the candidate view', () => {
    const view = JSON.stringify(exam.candidate);
    expect(view).not.toMatch(/"answers?"|answerUnits|explanation|examinerNotes|K-O-W-A-L/);
    expect(exam.staff.explanations?.listening[1]).toMatch(/K-O-W-A-L-S-K-I/);
    expect(exam.staff.explanations?.listening[8]).toMatch(/Swimming/);
    expect(exam.staff.notes?.writingTask2).toMatch(/outweighs/);
  });

  it('"ONE WORD OR A NUMBER": words alone or a number alone', () => {
    const g = exam.candidate.listening.parts[0].questionGroups[0];
    expect(g.instructions).toMatch(/ONE WORD OR A NUMBER/);
    const key = exam.answerKey.listening;
    expect(markModule(key, { 2: '4512', 4: '35' }).raw).toBe(2);
    expect(withinWordLimit('35 pounds', { maxWords: 1, allowNumber: true, numberRule: 'or' })).toBe(false);
    expect(withinWordLimit('35 pounds', { maxWords: 1, allowNumber: true })).toBe(true);
    expect(wordLimitPhrase({ maxWords: 2, allowNumber: true, numberRule: 'or' })).toBe('NO MORE THAN TWO WORDS OR A NUMBER');
  });

  it('"Which TWO …?" short answers score in any order, a repeated answer once', () => {
    const key = exam.answerKey.listening;
    expect(markModule(key, { 7: 'tennis', 8: 'Swimming' }).raw).toBe(2);
    expect(markModule(key, { 7: 'tennis', 8: 'tennis' }).raw).toBe(1);
    expect(markModule(key, { 8: 'swimming' }).correct).toMatchObject({ 7: true, 8: false });
    const g = exam.candidate.listening.parts[0].questionGroups[1];
    expect(g.numbers).toEqual([7, 8]);
  });

  it('map letters drawn by the exam, plan labels from a box, a question picture', () => {
    const [map, plan] = exam.candidate.listening.parts[1].questionGroups;
    expect(map.letterPositions).toHaveLength(8);
    expect(map.instructions).toMatch(/Label the map below/);
    expect(plan.instructions).toMatch(/Label the plan below\.\nChoose \*\*THREE\*\* answers from the box/);
    expect(exam.answerKey.listening[16]).toEqual({ kind: 'choice', answer: 'A' });
    expect(exam.candidate.listening.parts[0].questionGroups[2].questions).toEqual(
      expect.arrayContaining([expect.objectContaining({ number: 9, image: 'bags' })]),
    );
  });

  it('matching information over labelled General Training texts', () => {
    const g = exam.candidate.reading.sections[0].questionGroups[0];
    expect(g.paragraphs).toEqual(['A', 'B', 'C', 'D']);
    expect(g.instructions).toMatch(/Look at the 4 texts, \*\*A–D\*\*/);
    expect(markModule(exam.answerKey.reading, { 1: 'C', 2: 'B', 3: 'D' }).raw).toBe(3);
  });

  it('refuses broken 1.1 content', () => {
    expect(
      gtErrors((p) => {
        p.listening.parts[1].questionGroups[0].letterPositions.pop();
      }),
    ).toMatch(/give one position for each letter/);
    expect(
      gtErrors((p) => {
        p.listening.parts[2].questionGroups[0].flow.edges.push({ from: 'site', to: 'nowhere' });
      }),
    ).toMatch(/points to an unknown box/);
    expect(
      gtErrors((p) => {
        p.reading.sections[2].questionGroups[0].headings.splice(6);
      }),
    ).toMatch(/more headings than paragraphs/);
    expect(
      gtErrors((p) => {
        p.reading.sections[0].texts[3].label = undefined;
      }),
    ).toMatch(/label every text of the section or none/);
    expect(
      gtErrors((p) => {
        p.listening.parts[0].questionGroups[1].questions[0].answerUnits = [['swimming'], ['Swimming']];
      }),
    ).toMatch(/two answer units accept the same answer/);
    expect(
      gtErrors((p) => {
        p.reading.sections[2].questionGroups.unshift({
          type: 'diagram_label_completion',
          visualKind: 'map',
          image: 'centre-map',
          wordLimit: { maxWords: 1, allowNumber: false },
          labels: [{ number: 28, x: 10, y: 10, answers: ['x'] }],
        });
      }),
    ).toMatch(/reading labelling is always a diagram/);
  });
});

describe('band tables meet the official average raw-score anchors (ielts.org, scoring in detail)', () => {
  it.each([
    [16, 5], [23, 6], [30, 7], [35, 8],
  ])('Listening %i → %f', (raw, band) => expect(listeningBand(raw)).toBe(band));
  it.each([
    [15, 5], [23, 6], [30, 7], [35, 8],
  ])('Academic Reading %i → %f', (raw, band) => expect(readingBand(raw, 'academic')).toBe(band));
  it.each([
    [15, 4], [23, 5], [30, 6], [35, 7],
  ])('General Training Reading %i → %f', (raw, band) => expect(readingBand(raw, 'general_training')).toBe(band));
});
