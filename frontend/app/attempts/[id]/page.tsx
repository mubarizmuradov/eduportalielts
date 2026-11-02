'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { RichText } from '@/components/exam/RichText';
import { Band, Button, ErrorBanner, fmtDate, Loading, Page } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import { assetUrl, type SpeakingContent } from '@/lib/exam-types';
import { useErrorText, useI18n } from '@/lib/i18n';
import type { AttemptResult, SheetRow, SpeakingCriteria, WritingCriteria } from '@/lib/types';

const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const roundHalf = (v: number) => Math.floor(v * 2 + 0.5) / 2;
const BANDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Question text of a Speaking recording slot (same order as the exam). */
function speakingQuestion(c: SpeakingContent, part: number, index: number): string {
  if (part === 1) return c.part1.topics.flatMap((t) => t.questions)[index]?.text ?? '';
  if (part === 3) return c.part3.themes.flatMap((t) => t.questions)[index]?.text ?? '';
  return index === 0 ? c.part2.topic : (c.part2.roundingOff[index - 1]?.text ?? '');
}

function Criteria<K extends string>({
  keys,
  labels,
  value,
  onChange,
  readOnly,
}: {
  keys: K[];
  labels: Record<K, string>;
  value: Partial<Record<K, number>>;
  onChange(v: Partial<Record<K, number>>): void;
  readOnly?: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {keys.map((k) => (
        <label key={k} className="flex items-center justify-between gap-3 rounded-lg bg-black/[0.03] px-3 py-2 dark:bg-white/5">
          <span className="text-sm font-medium">{labels[k]}</span>
          {readOnly ? (
            <Band value={value[k]} />
          ) : (
            <select
              className="input !w-20 !py-1"
              value={value[k] ?? ''}
              onChange={(e) => onChange({ ...value, [k]: e.target.value === '' ? undefined : Number(e.target.value) })}
            >
              <option value="">–</option>
              {BANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          )}
        </label>
      ))}
    </div>
  );
}

function Sheet({ title, rows, raw, band }: { title: string; rows: SheetRow[]; raw: number | null; band: number | null }) {
  const { t } = useI18n();
  return (
    <details className="card p-4">
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 font-bold">
        {title} · {t('result.answerSheet')} <Band value={band} />
        {raw !== null && <span className="text-muted text-sm font-normal">{t('result.raw', { raw })}</span>}
      </summary>
      <div className="mt-3 grid gap-x-6 sm:grid-cols-2">
        {[rows.slice(0, 20), rows.slice(20)].map((col, i) => (
          <table key={i} className="w-full text-sm">
            <thead className="text-muted text-left text-xs">
              <tr>
                <th className="py-1 pr-2">#</th>
                <th className="py-1 pr-2">{t('result.yourAnswer')}</th>
                <th className="py-1">{t('result.correctAnswer')}</th>
              </tr>
            </thead>
            <tbody>
              {col.map((r) => (
                <tr key={r.number} className="border-t border-[var(--card-border)]">
                  <td className="py-1 pr-2 font-bold">{r.number}</td>
                  <td className={`py-1 pr-2 ${r.correct === true ? 'text-[#15803d]' : r.correct === false ? 'text-[#b91c1c]' : ''}`}>
                    {r.correct === true ? '✓ ' : r.correct === false ? '✗ ' : ''}
                    {r.answer.replace('_', ' ') || '—'}
                  </td>
                  <td className="text-muted py-1">{r.key}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
    </details>
  );
}

export default function AttemptPage() {
  const { me } = useRequireAuth();
  const { t, locale } = useI18n();
  const errorText = useErrorText();
  const { id } = useParams<{ id: string }>();
  const [r, setR] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [w1, setW1] = useState<Partial<WritingCriteria>>({});
  const [w2, setW2] = useState<Partial<WritingCriteria>>({});
  const [wComment, setWComment] = useState('');
  const [sp, setSp] = useState<Partial<SpeakingCriteria>>({});
  const [sComment, setSComment] = useState('');
  const [busy, setBusy] = useState<'w' | 's' | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const apply = (x: AttemptResult) => {
    setR(x);
    if (x.writing.scores) {
      setW1(x.writing.scores.task1);
      setW2(x.writing.scores.task2);
      setWComment(x.writing.scores.comment ?? '');
    }
    if (x.speaking.scores) {
      setSp(x.speaking.scores);
      setSComment(x.speaking.scores.comment ?? '');
    }
  };

  useEffect(() => {
    if (!me) return;
    api<AttemptResult>(`/attempts/${id}/result`)
      .then(apply)
      .catch((e) => setError(e instanceof ApiError && e.code === 'RESULTS_NOT_RELEASED' ? t('result.notReleased') : errorText(e.code)));
  }, [me, id, errorText, t]);

  const grade = async (part: 'w' | 's') => {
    setBusy(part);
    setError(null);
    setSavedMsg(null);
    try {
      const body =
        part === 'w'
          ? { writing: { task1: w1, task2: w2, ...(wComment.trim() ? { comment: wComment.trim() } : {}) } }
          : { speaking: { ...sp, ...(sComment.trim() ? { comment: sComment.trim() } : {}) } };
      apply(await api<AttemptResult>(`/attempts/${id}/grade`, { method: 'PUT', body }));
      setSavedMsg(t('common.saved'));
    } catch (e) {
      setError(e instanceof ApiError ? errorText(e.code, e.message) : errorText(undefined));
    } finally {
      setBusy(null);
    }
  };

  if (!r)
    return error ? (
      <Page>
        <ErrorBanner message={error} />
        <Link className="underline" href="/dashboard">
          {t('common.back')}
        </Link>
      </Page>
    ) : (
      <Loading />
    );

  const staff = r.staff;
  const crit = t('grade.criteria.ta1');
  const wLabels1: Record<keyof WritingCriteria, string> = { ta: crit, cc: t('grade.criteria.cc'), lr: t('grade.criteria.lr'), gra: t('grade.criteria.gra') };
  const wLabels2 = { ...wLabels1, ta: t('grade.criteria.ta2') };
  const sLabels: Record<keyof SpeakingCriteria, string> = { fc: t('grade.criteria.fc'), lr: t('grade.criteria.lr'), gra: t('grade.criteria.gra'), p: t('grade.criteria.p') };
  const complete = <T extends object>(v: Partial<T>, keys: (keyof T)[]) => keys.every((k) => typeof v[k] === 'number');
  const taskBand = (v: Partial<WritingCriteria>) =>
    complete(v, ['ta', 'cc', 'lr', 'gra']) ? (v.ta! + v.cc! + v.lr! + v.gra!) / 4 : null;
  const writingPreview = taskBand(w1) !== null && taskBand(w2) !== null ? roundHalf((taskBand(w1)! + 2 * taskBand(w2)!) / 3) : null;
  const speakingPreview = complete(sp, ['fc', 'lr', 'gra', 'p']) ? roundHalf((sp.fc! + sp.lr! + sp.gra! + sp.p!) / 4) : null;
  const writingDone = r.attempt.status !== 'IN_PROGRESS' || r.attempt.currentModule === 'speaking';
  const speakingDone = r.attempt.status !== 'IN_PROGRESS';

  const bandBox = (label: string, v: number | null, big?: boolean) => (
    <div className={`rounded-xl border border-[var(--card-border)] p-3 text-center ${big ? 'bg-[#14284b] text-white dark:bg-[#22355a]' : ''}`}>
      <div className={`text-xs font-semibold uppercase ${big ? 'opacity-80' : 'text-muted'}`}>{label}</div>
      <div className={`font-extrabold tabular-nums ${big ? 'text-4xl' : 'text-2xl'}`}>{v === null ? '–' : v.toFixed(1)}</div>
      {v === null && <div className={`text-xs ${big ? 'opacity-80' : 'text-muted'}`}>{t('result.pending')}</div>}
    </div>
  );

  return (
    <Page>
      {staff && (
        <Link className="text-muted text-sm underline" href={`/assignments/${r.assignment.id}`}>
          ← {r.assignment.title}
        </Link>
      )}
      <section className="card space-y-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-muted text-xs font-semibold uppercase">{t('result.title')}</p>
            <h1 className="text-2xl font-bold">{r.candidate.name}</h1>
            <p className="text-muted text-sm">
              {t('result.candidateNumber')}: {r.candidate.number} · {r.test.title} ({r.test.testType === 'academic' ? t('common.academic') : t('common.generalTraining')}) ·{' '}
              {t('result.testDate')}: {fmtDate(r.attempt.startedAt, locale)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {bandBox(t('common.listening'), r.bands.listening)}
          {bandBox(t('common.reading'), r.bands.reading)}
          {bandBox(t('common.writing'), r.bands.writing)}
          {bandBox(t('common.speaking'), r.bands.speaking)}
          {bandBox(t('result.overall'), r.bands.overall, true)}
        </div>
      </section>

      <ErrorBanner message={error} />
      {savedMsg && <p className="font-semibold text-[#15803d]">✓ {savedMsg}</p>}

      {/* Writing */}
      <section className="card space-y-4 p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          {t('common.writing')} <Band value={staff ? writingPreview : r.bands.writing} />
        </h2>
        {!writingDone ? (
          <p className="text-muted">{t('grade.notFinished')}</p>
        ) : (
          r.writing.tasks.map((task, i) => {
            const text = r.writing.texts[i];
            const words = countWords(text);
            const v = i === 0 ? w1 : w2;
            return (
              <div key={task.taskNumber} className="space-y-2 border-t border-[var(--card-border)] pt-4 first:border-0 first:pt-0">
                <details>
                  <summary className="cursor-pointer font-semibold">Task {task.taskNumber}</summary>
                  <div className="mt-2 space-y-2 text-sm">
                    <RichText text={task.body} />
                    {task.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={assetUrl(r.test.id, task.image)} alt="" className="max-w-md rounded border" />
                    )}
                  </div>
                </details>
                <p className={`text-sm font-semibold ${words < task.minWords ? 'text-[#b91c1c]' : 'text-muted'}`}>
                  {t('grade.words', { n: words })} ({t('grade.minWords', { n: task.minWords })})
                </p>
                <div className="rounded-lg border border-[var(--card-border)] bg-black/[0.02] p-3 text-sm leading-relaxed whitespace-pre-wrap dark:bg-white/5">
                  {text || <span className="text-muted">{t('grade.noText')}</span>}
                </div>
                {(staff || r.writing.scores) && (
                  <Criteria
                    keys={['ta', 'cc', 'lr', 'gra']}
                    labels={i === 0 ? wLabels1 : wLabels2}
                    value={v}
                    onChange={i === 0 ? setW1 : setW2}
                    readOnly={!staff}
                  />
                )}
                {staff && taskBand(v) !== null && <p className="text-muted text-sm">{t('grade.taskBand', { band: taskBand(v)!.toFixed(2) })}</p>}
              </div>
            );
          })
        )}
        {staff && writingDone ? (
          <div className="space-y-2">
            <textarea className="input h-24" placeholder={t('grade.comment')} value={wComment} onChange={(e) => setWComment(e.target.value)} />
            <Button onClick={() => void grade('w')} loading={busy === 'w'} disabled={writingPreview === null}>
              {t('grade.saveWriting')}
            </Button>
          </div>
        ) : (
          r.writing.scores?.comment && (
            <p className="rounded-lg bg-[#e8edf6] p-3 text-sm dark:bg-[#22355a]">
              <strong>{t('result.feedback')}:</strong> {r.writing.scores.comment}
            </p>
          )
        )}
      </section>

      {/* Speaking */}
      <section className="card space-y-4 p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          {t('common.speaking')} <Band value={staff ? speakingPreview : r.bands.speaking} />
        </h2>
        {!speakingDone ? (
          <p className="text-muted">{t('grade.notFinished')}</p>
        ) : r.speaking.recordings.length === 0 ? (
          <p className="text-muted">{t('grade.noRecordings')}</p>
        ) : (
          [1, 2, 3].map((part) => {
            const recs = r.speaking.recordings.filter((x) => x.part === part);
            return (
              <div key={part} className="space-y-2">
                <p className="font-semibold">{t(`grade.part${part}` as 'grade.part1')}</p>
                {recs.length === 0 && <p className="text-muted text-sm">{t('grade.missing')}</p>}
                {recs.map((rec) => (
                  <div key={rec.id} className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="min-w-0 flex-1">
                      {part === 2 && rec.index === 0 ? <strong>{t('grade.longTurn')}: </strong> : part === 2 ? <strong>{t('grade.roundingOff')}: </strong> : null}
                      {speakingQuestion(r.speaking.content, part, rec.index)}
                    </span>
                    <audio controls preload="none" src={`/api/attempts/${r.attempt.id}/recordings/${rec.id}`} className="h-9 w-72 max-w-full" />
                  </div>
                ))}
              </div>
            );
          })
        )}
        {(staff ? speakingDone : !!r.speaking.scores) && (
          <Criteria keys={['fc', 'lr', 'gra', 'p']} labels={sLabels} value={sp} onChange={setSp} readOnly={!staff} />
        )}
        {staff && speakingDone ? (
          <div className="space-y-2">
            <textarea className="input h-24" placeholder={t('grade.comment')} value={sComment} onChange={(e) => setSComment(e.target.value)} />
            <Button onClick={() => void grade('s')} loading={busy === 's'} disabled={speakingPreview === null}>
              {t('grade.saveSpeaking')}
            </Button>
          </div>
        ) : (
          r.speaking.scores?.comment && (
            <p className="rounded-lg bg-[#e8edf6] p-3 text-sm dark:bg-[#22355a]">
              <strong>{t('result.feedback')}:</strong> {r.speaking.scores.comment}
            </p>
          )
        )}
      </section>

      <Sheet title={t('common.listening')} rows={r.listening} raw={r.raw.listening} band={r.bands.listening} />
      <Sheet title={t('common.reading')} rows={r.reading} raw={r.raw.reading} band={r.bands.reading} />

      {r.transcripts && (
        <details className="card p-4">
          <summary className="cursor-pointer font-bold">{t('result.transcripts')}</summary>
          <div className="mt-2 space-y-3 text-sm">
            {r.transcripts.map((x) => (
              <div key={x.partNumber}>
                <p className="font-semibold">Part {x.partNumber}</p>
                <p className="whitespace-pre-wrap">{x.transcript}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </Page>
  );
}
