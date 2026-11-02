'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { RichText } from '@/components/exam/RichText';
import { IssueList, Summary } from '@/components/TestBits';
import { Button, ErrorBanner, Field, Loading, Page } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import { assetUrl, type Group } from '@/lib/exam-types';
import { useErrorText, useI18n } from '@/lib/i18n';
import type { ClassOption, TestDetail } from '@/lib/types';

const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

function groupLabel(g: Group) {
  const range = g.range[0] === g.range[1] ? `Question ${g.range[0]}` : `Questions ${g.range[0]}–${g.range[1]}`;
  const kind = g.type === 'completion' ? `${g.variant.replace('_', '-')} completion${g.answerMode === 'select' ? ' (word bank)' : ''}` : g.type.replace(/_/g, ' ');
  return `${range} · ${kind}`;
}

function AnswerTable({ groups, answers }: { groups: Group[]; answers: Record<string, string> }) {
  return (
    <div className="space-y-2">
      {groups.map((g) => (
        <div key={g.range[0]}>
          <p className="text-sm font-semibold">{groupLabel(g)}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
            {g.numbers.map((n) => (
              <span key={n}>
                <strong>{n}</strong> {answers[n]}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AssignForm({ test }: { test: TestDetail }) {
  const { t } = useI18n();
  const errorText = useErrorText();
  const [classes, setClasses] = useState<ClassOption[] | null>(null);
  const [classId, setClassId] = useState('');
  const [title, setTitle] = useState(test.title);
  const [opensAt, setOpensAt] = useState(() => toLocalInput(new Date()));
  const [closesAt, setClosesAt] = useState(() => toLocalInput(new Date(Date.now() + 7 * 86_400_000)));
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; classTitle: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<ClassOption[]>('/assignments/classes')
      .then((list) => setClasses(list.filter((c) => c.academyId === test.academyId)))
      .catch(() => setClasses([]));
  }, [test.academyId]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const cls = classes?.find((c) => c.id === (classId || classes?.[0]?.id));
      const r = await api<{ id: string; classTitle: string }>('/assignments', {
        body: { testId: test.id, classId: cls?.id, title, opensAt: new Date(opensAt).toISOString(), closesAt: new Date(closesAt).toISOString() },
      });
      setDone(r);
    } catch (e) {
      setError(e instanceof ApiError ? errorText(e.code, e.message) : errorText(undefined));
    } finally {
      setBusy(false);
    }
  };

  if (!classes) return <Loading />;
  if (classes.length === 0) return <p className="text-muted">{t('testPage.noClasses')}</p>;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label={t('testPage.class')}>
          <select className="input" value={classId || classes[0].id} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} — {c.campusName}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('testPage.assignmentTitle')}>
          <input className="input" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label={t('testPage.opensAt')}>
          <input type="datetime-local" className="input" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} />
        </Field>
        <Field label={t('testPage.closesAt')}>
          <input type="datetime-local" className="input" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
        </Field>
      </div>
      <ErrorBanner message={error} />
      {done ? (
        <p className="font-semibold text-[#15803d]">
          ✓ {t('testPage.assigned', { class: done.classTitle })}{' '}
          <Link className="underline" href={`/assignments/${done.id}`}>
            →
          </Link>
        </p>
      ) : (
        <Button onClick={() => void submit()} loading={busy}>
          {t('testPage.assign')}
        </Button>
      )}
    </div>
  );
}

export default function TestPage() {
  const { me } = useRequireAuth();
  const { t } = useI18n();
  const errorText = useErrorText();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [test, setTest] = useState<TestDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    api<TestDetail>(`/tests/${id}`)
      .then(setTest)
      .catch((e) => setError(errorText(e.code)));
  }, [me, id, errorText]);

  const archive = async () => {
    if (!window.confirm(t('testPage.archiveConfirm'))) return;
    await api(`/tests/${id}`, { method: 'DELETE' });
    router.push('/dashboard');
  };

  if (error)
    return (
      <Page>
        <ErrorBanner message={error} />
      </Page>
    );
  if (!test) return <Loading />;
  const c = test.candidate;
  return (
    <Page>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{test.title}</h1>
          <p className="text-muted">{test.testType === 'ACADEMIC' ? t('common.academic') : t('common.generalTraining')}</p>
        </div>
        <Link href={`/tests/${id}/preview`}>
          <Button variant="secondary">{t('testPage.preview')}</Button>
        </Link>
        <Button variant="ghost" onClick={() => void archive()}>
          {t('testPage.archive')}
        </Button>
      </div>

      <div className="card space-y-3 p-5">
        <Summary s={test.summary} />
        {test.warnings.length > 0 && (
          <details>
            <summary className="cursor-pointer text-sm font-semibold">{t('testPage.warnings')} ({test.warnings.length})</summary>
            <div className="mt-2">
              <IssueList items={test.warnings} tone="warn" />
            </div>
          </details>
        )}
      </div>

      <section className="card space-y-3 p-5">
        <h2 className="text-lg font-bold">{t('testPage.assignTitle')}</h2>
        <AssignForm test={test} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">
          {t('testPage.contents')} · {t('testPage.answerKey')}
        </h2>
        <details className="card p-4" open>
          <summary className="cursor-pointer font-bold">{t('common.listening')}</summary>
          <div className="mt-3 space-y-5">
            {c.listening.parts.map((p, i) => (
              <div key={p.partNumber} className="space-y-2">
                <p className="font-semibold">
                  {t('testPage.part', { n: p.partNumber })} · {t('testPage.seconds', { n: Math.round(p.audioSeconds) })}
                </p>
                {test.staff.listening[i]?.context && <p className="text-muted text-sm">{test.staff.listening[i].context}</p>}
                <audio controls preload="none" src={assetUrl(test.id, p.audio)} className="w-full max-w-md" />
                <details>
                  <summary className="cursor-pointer text-sm font-semibold">{t('testPage.transcript')}</summary>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{test.staff.listening[i]?.transcript}</p>
                </details>
                <AnswerTable groups={p.questionGroups} answers={test.staff.answers.listening} />
              </div>
            ))}
          </div>
        </details>
        <details className="card p-4">
          <summary className="cursor-pointer font-bold">{t('common.reading')}</summary>
          <div className="mt-3 space-y-5">
            {c.reading.sections.map((s) => (
              <div key={s.sectionNumber} className="space-y-2">
                <p className="font-semibold">
                  {t('testPage.section', { n: s.sectionNumber })} · {s.texts.map((x) => x.title).join(' / ')}
                </p>
                <AnswerTable groups={s.questionGroups} answers={test.staff.answers.reading} />
              </div>
            ))}
          </div>
        </details>
        <details className="card p-4">
          <summary className="cursor-pointer font-bold">{t('common.writing')}</summary>
          <div className="mt-3 space-y-5">
            {c.writing.tasks.map((task) => (
              <div key={task.taskNumber} className="space-y-2">
                <p className="font-semibold">{t('testPage.task', { n: task.taskNumber })}</p>
                <RichText text={task.body} className="text-sm" />
                {task.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={assetUrl(test.id, task.image)} alt="" className="max-w-md rounded border" />
                )}
              </div>
            ))}
          </div>
        </details>
        <details className="card p-4">
          <summary className="cursor-pointer font-bold">{t('common.speaking')}</summary>
          <div className="mt-3 space-y-3 text-sm">
            <div>
              <p className="font-semibold">Part 1</p>
              {c.speaking.part1.topics.map((tp) => (
                <div key={tp.topic} className="mt-1">
                  <p className="italic">{tp.topic}</p>
                  <ul className="list-disc pl-5">
                    {tp.questions.map((q) => (
                      <li key={q.text}>{q.text}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div>
              <p className="font-semibold">Part 2</p>
              <p>{c.speaking.part2.topic}</p>
              <ul className="list-disc pl-5">
                {c.speaking.part2.bulletPoints.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p>{c.speaking.part2.finalPrompt}</p>
            </div>
            <div>
              <p className="font-semibold">Part 3</p>
              {c.speaking.part3.themes.map((th) => (
                <div key={th.theme} className="mt-1">
                  <p className="italic">{th.theme}</p>
                  <ul className="list-disc pl-5">
                    {th.questions.map((q) => (
                      <li key={q.text}>{q.text}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </details>
      </section>
    </Page>
  );
}
