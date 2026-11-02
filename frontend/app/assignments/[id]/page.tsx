'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Band, Button, ErrorBanner, fmtDate, Loading, Page } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import { useErrorText, useI18n } from '@/lib/i18n';
import type { AssignmentReport } from '@/lib/types';

export default function AssignmentPage() {
  const { me } = useRequireAuth();
  const { t, locale } = useI18n();
  const errorText = useErrorText();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<AssignmentReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<AssignmentReport>(`/assignments/${id}`)
      .then(setReport)
      .catch((e) => setError(errorText(e.code)));
  }, [id, errorText]);
  useEffect(() => {
    if (me) load();
  }, [me, load]);

  const release = async (on: boolean) => {
    setBusy(true);
    try {
      await api(`/assignments/${id}`, { method: 'PATCH', body: { resultsReleased: on } });
      load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(t('report.deleteConfirm'))) return;
    try {
      await api(`/assignments/${id}`, { method: 'DELETE' });
      router.push('/dashboard');
    } catch (e) {
      setError(e instanceof ApiError ? errorText(e.code) : errorText(undefined));
    }
  };

  if (!report)
    return error ? (
      <Page>
        <ErrorBanner message={error} />
      </Page>
    ) : (
      <Loading />
    );
  const a = report.assignment;
  const status = (r: AssignmentReport['rows'][number]) => {
    const at = r.attempt;
    if (!at) return <span className="text-muted">{t('report.notStarted')}</span>;
    if (at.status === 'IN_PROGRESS')
      return <span className="font-semibold text-[#b45309]">{t('report.inProgress', { module: (at.currentModule ?? '').toLowerCase() })}</span>;
    if (at.status === 'SUBMITTED') return <span className="font-semibold text-[#b4233a]">{t('report.submitted')}</span>;
    return <span className="font-semibold text-[#15803d]">{t('report.graded')}</span>;
  };

  return (
    <Page wide>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{a.title}</h1>
          <p className="text-muted">
            {a.classTitle} · {t('report.window', { opens: fmtDate(a.opensAt, locale), closes: fmtDate(a.closesAt, locale) })} ·{' '}
            <Link className="underline" href={`/tests/${a.testId}`}>
              {a.testTitle}
            </Link>
          </p>
        </div>
        <Button variant="ghost" onClick={() => void remove()}>
          {t('report.deleteAssignment')}
        </Button>
      </div>
      <ErrorBanner message={error} />
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <span className={`font-semibold ${a.resultsReleasedAt ? 'text-[#15803d]' : 'text-muted'}`}>
          {a.resultsReleasedAt ? t('report.resultsReleased') : t('report.resultsHidden')}
        </span>
        <Button className="ml-auto" variant={a.resultsReleasedAt ? 'secondary' : 'primary'} loading={busy} onClick={() => void release(!a.resultsReleasedAt)}>
          {a.resultsReleasedAt ? t('report.hide') : t('report.releaseResults')}
        </Button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-muted text-left text-xs uppercase">
            <tr className="border-b border-[var(--card-border)]">
              <th className="p-3">{t('report.student')}</th>
              <th className="p-3">{t('common.status')}</th>
              <th className="p-3 text-center">L</th>
              <th className="p-3 text-center">R</th>
              <th className="p-3 text-center">W</th>
              <th className="p-3 text-center">S</th>
              <th className="p-3 text-center">{t('common.overall')}</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r) => (
              <tr key={r.user.id} className="border-b border-[var(--card-border)] last:border-0">
                <td className="p-3 font-semibold">
                  {r.user.firstName} {r.user.lastName}
                </td>
                <td className="p-3">{status(r)}</td>
                <td className="p-3 text-center">
                  <Band value={r.attempt?.listeningBand} />
                  {r.attempt?.listeningRaw != null && <div className="text-muted text-xs">{r.attempt.listeningRaw}/40</div>}
                </td>
                <td className="p-3 text-center">
                  <Band value={r.attempt?.readingBand} />
                  {r.attempt?.readingRaw != null && <div className="text-muted text-xs">{r.attempt.readingRaw}/40</div>}
                </td>
                <td className="p-3 text-center">
                  <Band value={r.attempt?.writingBand} />
                </td>
                <td className="p-3 text-center">
                  <Band value={r.attempt?.speakingBand} />
                </td>
                <td className="p-3 text-center">
                  <Band value={r.attempt?.overallBand} />
                </td>
                <td className="p-3 text-right">
                  {r.attempt && (
                    <Link href={`/attempts/${r.attempt.id}`}>
                      <Button size="sm" variant={r.attempt.status === 'SUBMITTED' ? 'primary' : 'secondary'}>
                        {r.attempt.status === 'SUBMITTED' ? t('report.mark') : t('report.open')}
                      </Button>
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  );
}
