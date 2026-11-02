'use client';

import { assetUrl, type Group, type Option } from '@/lib/exam-types';
import { DragChip, DropGap } from './DragDrop';
import { Q, useExam } from './ExamContext';
import { inline, RichText, withGaps } from './RichText';

/** Typed answer box, numbered like the IELTS computer test. Spell-check is off, as in the real test. */
export function GapInput({ n, wide }: { n: number; wide?: boolean }) {
  const { answers, setAnswer, setCurrent } = useExam();
  return (
    <input
      className="ex-gap"
      style={wide ? { width: '14em' } : undefined}
      data-gap={n}
      aria-label={`Question ${n}`}
      placeholder={String(n)}
      value={answers[n] ?? ''}
      maxLength={60}
      spellCheck={false}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      onFocus={() => setCurrent(n)}
      onChange={(e) => setAnswer(n, e.target.value)}
    />
  );
}

function Radio({ n, value, label, children }: { n: number; value: string; label: string; children?: React.ReactNode }) {
  const { answers, setAnswer } = useExam();
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded px-1 py-0.5 hover:bg-black/5">
      <input
        type="radio"
        className="mt-1"
        name={`q-${n}`}
        value={value}
        checked={answers[n] === value}
        onChange={() => setAnswer(n, value)}
        aria-label={`Question ${n}: ${label}`}
      />
      <span>{children ?? label}</span>
    </label>
  );
}

function OptionsBox({ title, options }: { title?: string; options: Option[] }) {
  return (
    <div className="ex-border my-3 inline-block min-w-[18em] border p-3">
      {title && <p className="mb-1 font-bold">{title}</p>}
      <table>
        <tbody>
          {options.map((o) => (
            <tr key={o.key}>
              <td className="pr-3 align-top font-bold">{o.key}</td>
              <td>{o.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChipBank({ group, options, answersUsed, reusable, title }: { group: number; options: Option[]; answersUsed: string[]; reusable?: boolean; title?: string }) {
  return (
    <div className="ex-border my-3 rounded border p-3">
      {title && <p className="mb-2 font-bold">{title}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <DragChip key={o.key} group={group} option={o} used={!reusable && answersUsed.includes(o.key)} />
        ))}
      </div>
    </div>
  );
}

function Select({ n, keys }: { n: number; keys: string[] }) {
  const { answers, setAnswer, setCurrent } = useExam();
  return (
    <select
      className="ex-select"
      data-gap={n}
      aria-label={`Question ${n}`}
      value={answers[n] ?? ''}
      onFocus={() => setCurrent(n)}
      onChange={(e) => setAnswer(n, e.target.value)}
    >
      <option value=""> </option>
      {keys.map((k) => (
        <option key={k} value={k}>
          {k}
        </option>
      ))}
    </select>
  );
}

/** One IELTS task ("Questions 1–5") in the computer-delivered layout. */
export function QuestionGroup({ g }: { g: Group }) {
  const { answers, setAnswer } = useExam();
  const used = g.numbers.map((n) => answers[n]).filter(Boolean);
  const [a, b] = g.range;

  return (
    <section className="space-y-3" aria-label={`Questions ${a} to ${b}`}>
      <div>
        <h3 className="font-bold">{a === b ? `Question ${a}` : `Questions ${a}–${b}`}</h3>
        <RichText text={g.instructions} className="mt-1" />
      </div>
      {g.title && g.type !== 'completion' && g.type !== 'diagram_label_completion' && g.type !== 'map_labelling' && (
        <p className="font-bold">{g.title}</p>
      )}
      {g.example && (
        <p className="ex-border border-l-4 pl-3 italic">
          <span className="font-bold not-italic">Example: </span>
          {g.example}
        </p>
      )}

      {g.type === 'multiple_choice' &&
        g.questions.map((q) => (
          <Q key={q.number} n={q.number}>
            <p className="mb-1">
              <strong className="mr-2">{q.number}</strong>
              {inline(q.stem)}
            </p>
            {q.image && <QuestionImage image={q.image} alt={`Question ${q.number}`} />}
            <div className="space-y-0.5 pl-6">
              {q.options.map((o) => (
                <Radio key={o.key} n={q.number} value={o.key} label={`${o.key} ${o.text}`}>
                  <strong className="mr-2">{o.key}</strong>
                  {o.text}
                </Radio>
              ))}
            </div>
          </Q>
        ))}

      {g.type === 'multiple_choice_multi' &&
        g.items.map((item) => {
          const chosen = item.numbers.map((n) => answers[n]).filter(Boolean);
          const toggle = (key: string) => {
            const next = chosen.includes(key) ? chosen.filter((k) => k !== key) : chosen.length < item.choose ? [...chosen, key] : chosen;
            const sorted = [...next].sort();
            item.numbers.forEach((n, i) => setAnswer(n, sorted[i] ?? ''));
          };
          return (
            <Q key={item.numbers[0]} n={item.numbers[0]}>
              {item.numbers.slice(1).map((n) => (
                <span key={n} id={`q-${n}`} data-q={n} className="block" />
              ))}
              <p className="mb-1">
                <strong className="mr-2">
                  {item.numbers[0]}–{item.numbers[item.numbers.length - 1]}
                </strong>
                {inline(item.stem)}
              </p>
              <div className="space-y-0.5 pl-6">
                {item.options.map((o) => (
                  <label key={o.key} className="flex cursor-pointer items-start gap-2.5 rounded px-1 py-0.5 hover:bg-black/5">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={chosen.includes(o.key)}
                      disabled={!chosen.includes(o.key) && chosen.length >= item.choose}
                      onChange={() => toggle(o.key)}
                      aria-label={`${o.key} ${o.text}`}
                    />
                    <span>
                      <strong className="mr-2">{o.key}</strong>
                      {o.text}
                    </span>
                  </label>
                ))}
              </div>
            </Q>
          );
        })}

      {(g.type === 'true_false_not_given' || g.type === 'yes_no_not_given') &&
        g.questions.map((q) => (
          <Q key={q.number} n={q.number}>
            <p className="mb-1">
              <strong className="mr-2">{q.number}</strong>
              {inline(q.statement)}
            </p>
            <div className="flex flex-col gap-0.5 pl-6">
              {g.choices.map((c) => (
                <Radio key={c.value} n={q.number} value={c.value} label={c.label} />
              ))}
            </div>
          </Q>
        ))}

      {g.type === 'matching_headings' && (
        <>
          <ChipBank group={a} options={g.headings} answersUsed={used} title="List of Headings" />
          {g.questions.map((q) => (
            <Q key={q.number} n={q.number} className="flex flex-wrap items-center gap-2">
              <strong>{q.number}</strong>
              <span>Paragraph {q.paragraph}</span>
              <DropGap n={q.number} group={a} options={g.headings} />
            </Q>
          ))}
        </>
      )}

      {g.type === 'matching_information' &&
        g.questions.map((q) => (
          <Q key={q.number} n={q.number} className="flex items-start gap-2">
            <strong className="min-w-6">{q.number}</strong>
            <span className="flex-1">{inline(q.statement)}</span>
            <Select n={q.number} keys={g.paragraphs} />
          </Q>
        ))}

      {g.type === 'matching_features' && (
        <>
          <OptionsBox title={g.optionsTitle} options={g.options} />
          {g.questions.map((q) => (
            <Q key={q.number} n={q.number} className="flex items-start gap-2">
              <strong className="min-w-6">{q.number}</strong>
              <span className="flex-1">{inline(q.statement)}</span>
              <Select n={q.number} keys={g.options.map((o) => o.key)} />
            </Q>
          ))}
        </>
      )}

      {g.type === 'matching_sentence_endings' && (
        <>
          {g.questions.map((q) => (
            <Q key={q.number} n={q.number} className="flex flex-wrap items-center gap-2">
              <strong>{q.number}</strong>
              <span>{inline(q.sentenceStart)}</span>
              <DropGap n={q.number} group={a} options={g.endings} />
            </Q>
          ))}
          <ChipBank group={a} options={g.endings} answersUsed={used} />
        </>
      )}

      {g.type === 'map_labelling' && <MapLabelling g={g} />}

      {g.type === 'completion' && <Completion g={g} />}

      {g.type === 'sentence_completion' &&
        g.questions.map((q) => (
          <Q key={q.number} n={q.number}>
            <p>{withGaps(q.sentence, (n) => <GapInput n={n} />)}</p>
          </Q>
        ))}

      {g.type === 'diagram_label_completion' && <DiagramLabels g={g} />}

      {g.type === 'short_answer' &&
        g.questions.map((q) =>
          'numbers' in q ? (
            // "Which TWO …?": one box per number, answers in any order.
            <Q key={q.numbers[0]} n={q.numbers[0]}>
              {q.numbers.slice(1).map((n) => (
                <span key={n} id={`q-${n}`} data-q={n} className="block" />
              ))}
              <p className="mb-1">
                <strong className="mr-2">
                  {q.numbers[0]}–{q.numbers[q.numbers.length - 1]}
                </strong>
                {inline(q.question)}
              </p>
              <div className="flex flex-col gap-1.5 pl-6">
                {q.numbers.map((n) => (
                  <GapInput key={n} n={n} wide />
                ))}
              </div>
            </Q>
          ) : (
            <Q key={q.number} n={q.number}>
              <p className="mb-1">
                <strong className="mr-2">{q.number}</strong>
                {inline(q.question)}
              </p>
              <div className="pl-6">
                <GapInput n={q.number} wide />
              </div>
            </Q>
          ),
        )}
    </section>
  );
}

/** Image of a question (pictures A–C …), shown at its natural size, never wider than the column. */
function QuestionImage({ image, alt }: { image: string; alt: string }) {
  const { testId } = useExam();
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={assetUrl(testId, image)} alt={alt} className="ex-border my-2 block max-h-[360px] max-w-full border" />;
}

const VISUAL_NAME = { map: 'Map', plan: 'Plan', diagram: 'Diagram', pictures: 'Pictures' } as const;

function MapLabelling({ g }: { g: Extract<Group, { type: 'map_labelling' }> }) {
  const { testId, answers, setAnswer, setCurrent } = useExam();
  const name = VISUAL_NAME[g.visualKind ?? 'map'];
  return (
    <div className="space-y-3">
      {g.title && <p className="font-bold">{g.title}</p>}
      {/* Letters are drawn on the image itself (percent of the image box, not of the column). */}
      <div className="relative inline-block max-w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={assetUrl(testId, g.image)} alt={g.title ?? name} className="ex-border block max-h-[420px] max-w-full border" />
        {g.letterPositions?.map((l) => (
          <span
            key={l.key}
            aria-hidden
            className="ex-map-letter absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${l.x}%`, top: `${l.y}%` }}
          >
            {l.key}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="ex-table border-collapse">
          <thead>
            <tr>
              <th />
              {g.letters.map((l) => (
                <th key={l} className="text-center">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {g.questions.map((q) => (
              <tr key={q.number} id={`q-${q.number}`} data-q={q.number} onFocusCapture={() => setCurrent(q.number)}>
                <td className="whitespace-nowrap">
                  <strong className="mr-2">{q.number}</strong>
                  {q.label}
                </td>
                {g.letters.map((l) => (
                  <td key={l} className="text-center">
                    <input
                      type="radio"
                      name={`q-${q.number}`}
                      aria-label={`Question ${q.number} ${q.label}: ${l}`}
                      checked={answers[q.number] === l}
                      onChange={() => setAnswer(q.number, l)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Completion({ g }: { g: Extract<Group, { type: 'completion' }> }) {
  const { answers } = useExam();
  const select = g.answerMode === 'select';
  const used = g.numbers.map((n) => answers[n]).filter(Boolean);
  const gap = (n: number) => (
    <span id={`q-${n}`} data-q={n} className="scroll-mt-24">
      {select ? <DropGap n={n} group={g.range[0]} options={g.options ?? []} /> : <GapInput n={n} />}
    </span>
  );
  const boxed = g.variant === 'form' || g.variant === 'note';
  return (
    <div className="space-y-3">
      {select && <ChipBank group={g.range[0]} options={g.options ?? []} answersUsed={used} />}
      <div className={boxed ? 'ex-border border p-4' : ''}>
        {g.title && <p className={`mb-2 font-bold ${boxed || g.variant === 'table' || g.variant === 'flow_chart' ? 'text-center' : ''}`}>{g.title}</p>}
        {g.lines && (
          <div className={g.variant === 'summary' ? 'leading-[2.3]' : 'space-y-1.5'}>
            {g.lines.map((l, i) =>
              l.style === 'heading' ? (
                <p key={i} className="pt-1 font-bold">
                  {withGaps(l.text, gap, `l${i}`)}
                </p>
              ) : l.style === 'bullet' ? (
                <p key={i} className="pl-4">
                  •&nbsp; {withGaps(l.text, gap, `l${i}`)}
                </p>
              ) : l.style === 'indent' ? (
                <p key={i} className="pl-10">
                  –&nbsp; {withGaps(l.text, gap, `l${i}`)}
                </p>
              ) : (
                <p key={i}>{withGaps(l.text, gap, `l${i}`)}</p>
              ),
            )}
          </div>
        )}
        {g.table && (
          <div className="overflow-x-auto">
            <table className="ex-table w-full border-collapse">
              <thead>
                <tr>
                  {g.table.columns.map((c, i) => (
                    <th key={i}>{withGaps(c, gap, `c${i}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.table.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="leading-[2.2]">
                        {withGaps(cell, gap, `r${ri}c${ci}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {g.flow && <FlowChart flow={g.flow} gap={gap} />}
        {g.steps && (
          <div className="mx-auto flex max-w-xl flex-col items-stretch">
            {g.steps.map((s, i) => (
              <div key={i} className="flex flex-col items-center">
                {i > 0 && <span aria-hidden className="py-0.5 text-lg leading-none">↓</span>}
                <div className="ex-flow-step w-full leading-[2.2]">{withGaps(s, gap, `s${i}`)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DiagramLabels({ g }: { g: Extract<Group, { type: 'diagram_label_completion' }> }) {
  const { testId, answers } = useExam();
  const select = g.answerMode === 'select';
  const options = g.options ?? [];
  const used = g.numbers.map((n) => answers[n]).filter(Boolean);
  return (
    <div className="space-y-2">
      {g.title && <p className="font-bold">{g.title}</p>}
      {select && <ChipBank group={g.range[0]} options={options} answersUsed={used} />}
      <div className="relative inline-block max-w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={assetUrl(testId, g.image)} alt={g.title ?? VISUAL_NAME[g.visualKind ?? 'diagram']} className="ex-border block max-w-full border" />
        {g.labels.map((l) => (
          <span
            key={l.number}
            id={`q-${l.number}`}
            data-q={l.number}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${l.x}%`, top: `${l.y}%` }}
          >
            {select ? <DropGap n={l.number} group={g.range[0]} options={options} showText={false} className="ex-drop-compact" /> : <GapInput n={l.number} />}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Flow-chart given as boxes and arrows: boxes are put in rows by their
 * distance from the start (branches side by side); an arrow that jumps back
 * or skips a row is written under its box.
 */
function FlowChart({ flow, gap }: { flow: NonNullable<Extract<Group, { type: 'completion' }>['flow']>; gap: (n: number) => React.ReactNode }) {
  const index = new Map(flow.nodes.map((n, i) => [n.id, i]));
  const level = new Map<string, number>();
  flow.nodes.forEach((n) => {
    const into = flow.edges.filter((e) => e.to === n.id && index.get(e.from)! < index.get(n.id)!);
    level.set(n.id, into.length ? Math.max(...into.map((e) => (level.get(e.from) ?? 0) + 1)) : 0);
  });
  const rows: (typeof flow.nodes)[] = [];
  flow.nodes.forEach((n) => (rows[level.get(n.id)!] ??= []).push(n));
  const short = (id: string) => {
    const t = flow.nodes[index.get(id)!].text.replace(/\{\{\s*(\d+)\s*\}\}/g, '($1)');
    return t.length > 40 ? `${t.slice(0, 40)}…` : t;
  };
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-stretch">
      {rows.filter(Boolean).map((row, ri) => (
        <div key={ri} className="flex flex-col items-center">
          {ri > 0 && (
            <span aria-hidden className="py-0.5 text-lg leading-none">
              {row.length > 1 ? '↙ ↘' : '↓'}
            </span>
          )}
          <div className="flex w-full justify-center gap-3">
            {row.map((n) => {
              const jumps = flow.edges.filter((e) => e.from === n.id && level.get(e.to)! !== level.get(n.id)! + 1);
              return (
                <div key={n.id} className="ex-flow-step flex-1 leading-[2.2]">
                  {withGaps(n.text, gap, n.id)}
                  {jumps.map((e) => (
                    <p key={e.to} className="ex-muted text-[0.85em] leading-snug">
                      → {short(e.to)}
                    </p>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
