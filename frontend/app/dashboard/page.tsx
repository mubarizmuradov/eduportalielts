'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Band, Button, EmptyState, ErrorBanner, fmtDate, Loading, Modal, Page } from '@/components/ui';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import { useErrorText, useI18n } from '@/lib/i18n';
import type { StaffAssignment, StudentAssignment, TestListItem } from '@/lib/types';

function TypeTag({ type }: { type: string }) {
  const { t } = useI18n();
  return (
    <span className="rounded bg-[#e8edf6] px-1.5 py-0.5 text-xs font-bold text-[#14284b] dark:bg-[#22355a] dark:text-[#dbe5ff]">
      {type === 'ACADEMIC' || type === 'academic' ? t('common.academic') : t('common.generalTraining')}
    </span>
  );
}

function StudentTests({ items }: { items: StudentAssignment[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [confirm, setConfirm] = useState<StudentAssignment | null>(null);
  const [now] = useState(() => Date.now());
  if (items.length === 0) return <EmptyState title={t('dashboard.noAssignments')} />;
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((a) => {
          const open = now >= new Date(a.opensAt).getTime() && now <= new Date(a.closesAt).getTime();
          const at = a.attempt;
          const finished = at && at.status !== 'IN_PROGRESS';
          return (
            <div key={a.id} className="card space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold">{a.title}</h3>
                  <p className="text-muted text-sm">{a.classTitle}</p>
                </div>
                <TypeTag type={a.test.testType} />
              </div>
              <p className="text-muted text-sm">
                {t('dashboard.opens')}: {fmtDate(a.opensAt, locale)} · {t('dashboard.closes')}: {fmtDate(a.closesAt, locale)}
              </p>
              {finished && a.resultsReleasedAt && at.overallBand !== undefined ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold">{t('common.overall')}</span> <Band value={at.overallBand} />
                  <span className="text-muted">
                    L <Band value={at.listeningBand} /> R <Band value={at.readingBand} /> W <Band value={at.writingBand} /> S <Band value={at.speakingBand} />
                  </span>
                </div>
              ) : null}
              <div>
                {finished ? (
                  a.resultsReleasedAt ? (
                    <Link href={`/attempts/${at.id}`}>
                      <Button variant="secondary">{t('dashboard.viewResult')}</Button>
                    </Link>
                  ) : (
                    <span className="text-muted text-sm font-semibold">{t('dashboard.waitingResults')}</span>
                  )
                ) : at ? (
                  <Link href={`/exam/${a.id}`}>
                    <Button>{t('dashboard.continue')}</Button>
                  </Link>
                ) : open ? (
                  <Button onClick={() => setConfirm(a)}>{t('dashboard.start')}</Button>
                ) : (
                  <span className="text-muted text-sm font-semibold">
                    {now < new Date(a.opensAt).getTime() ? t('dashboard.notOpenYet') : t('dashboard.closed')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={t('dashboard.startTitle')}>
        <p className="mb-4">{t('dashboard.startText')}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(null)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => confirm && router.push(`/exam/${confirm.id}`)}>{t('dashboard.startConfirm')}</Button>
        </div>
      </Modal>
    </>
  );
}

function StaffArea() {
  const { t, locale } = useI18n();
  const errorText = useErrorText();
  const [tab, setTab] = useState<'tests' | 'assignments'>('tests');
  const [tests, setTests] = useState<TestListItem[] | null>(null);
  const [assignments, setAssignments] = useState<StaffAssignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api<TestListItem[]>('/tests'), api<StaffAssignment[]>('/assignments')])
      .then(([a, b]) => {
        setTests(a);
        setAssignments(b);
      })
      .catch((e) => setError(errorText(e.code)));
  }, [errorText]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold">{t('dashboard.staffArea')}</h2>
        <div className="inline-flex rounded-lg bg-black/5 p-0.5 text-sm font-semibold dark:bg-white/10">
          {(['tests', 'assignments'] as const).map((k) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-md px-3 py-1 ${tab === k ? 'bg-white shadow dark:bg-[#3b5b9a]' : ''}`}>
              {t(`dashboard.${k}`)}
            </button>
          ))}
        </div>
        <Link href="/tests/import" className="ml-auto">
          <Button>+ {t('dashboard.importTest')}</Button>
        </Link>
      </div>
      <ErrorBanner message={error} />
      {!tests || !assignments ? (
        <Loading />
      ) : tab === 'tests' ? (
        tests.length === 0 ? (
          <EmptyState
            title={t('dashboard.noTests')}
            text={t('dashboard.noTestsHint')}
            action={
              <Link href="/tests/import">
                <Button>{t('dashboard.importTest')}</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {tests.map((x) => (
              <Link key={x.id} href={`/tests/${x.id}`} className="card block space-y-2 p-4 transition hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold">{x.title}</h3>
                  <TypeTag type={x.testType} />
                </div>
                <p className="text-muted text-sm">
                  L {x.summary.listening.questions} · R {x.summary.reading.questions} · W 2 · S 3
                </p>
                <p className="text-muted text-xs">
                  {fmtDate(x.createdAt, locale)}
                  {x.createdBy ? ` · ${t('dashboard.assignedBy', { name: `${x.createdBy.firstName} ${x.createdBy.lastName}` })}` : ''} ·{' '}
                  {t('dashboard.usedIn', { n: x.assignmentCount })}
                </p>
              </Link>
            ))}
          </div>
        )
      ) : assignments.length === 0 ? (
        <EmptyState title={t('dashboard.noStaffAssignments')} />
      ) : (
        <div className="card divide-y divide-[var(--card-border)]">
          {assignments.map((a) => (
            <Link key={a.id} href={`/assignments/${a.id}`} className="flex flex-wrap items-center gap-3 p-4 hover:bg-black/[0.02]">
              <div className="min-w-0 flex-1">
                <p className="font-bold">{a.title}</p>
                <p className="text-muted text-sm">
                  {a.classTitle} · {fmtDate(a.opensAt, locale)} – {fmtDate(a.closesAt, locale)}
                </p>
              </div>
              <span className="text-muted text-sm">
                {t('dashboard.progress', { started: a.counts.started, submitted: a.counts.submitted, graded: a.counts.graded })}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export default function Dashboard() {
  const { me } = useRequireAuth();
  const { t } = useI18n();
  const errorText = useErrorText();
  const [mine, setMine] = useState<StudentAssignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isStudent = !!me?.memberships.classes.some((c) => c.role === 'STUDENT');
  const isStaff = !!me && (me.staffAcademyIds.length > 0 || me.user.isSystemAdmin);

  useEffect(() => {
    if (!me || !isStudent) return;
    api<StudentAssignment[]>('/assignments/mine')
      .then(setMine)
      .catch((e) => setError(errorText(e.code)));
  }, [me, isStudent, errorText]);

  if (!me) return <Loading />;
  return (
    <Page>
      <h1 className="text-2xl font-bold">{t('dashboard.hello', { name: me.user.firstName })}</h1>
      <ErrorBanner message={error} />
      {(isStudent || !isStaff) && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">{t('dashboard.myTests')}</h2>
          {isStudent ? mine ? <StudentTests items={mine} /> : <Loading /> : <EmptyState title={t('dashboard.noAssignments')} />}
        </section>
      )}
      {isStaff && <StaffArea />}
    </Page>
  );
}
