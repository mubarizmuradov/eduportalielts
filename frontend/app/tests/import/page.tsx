'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, ErrorBanner, Field, Loading, Page } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import { useErrorText, useI18n } from '@/lib/i18n';
import type { BuildIssue, ExamSummary } from '@/lib/types';
import { IssueList, Summary } from '@/components/TestBits';

interface Check {
  ok: boolean;
  errors: BuildIssue[];
  warnings: BuildIssue[];
  summary?: ExamSummary;
}

const MAX_MB = 120;

export default function ImportPage() {
  const { me } = useRequireAuth();
  const { t } = useI18n();
  const errorText = useErrorText();
  const router = useRouter();
  const academies = me ? me.memberships.academies.filter((a) => me.staffAcademyIds.includes(a.academyId)) : [];
  const [academyId, setAcademyId] = useState('');
  const [raw, setRaw] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [check, setCheck] = useState<Check | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'check' | 'import' | null>(null);
  const academy = academyId || academies[0]?.academyId || '';

  const parsed = (): unknown | null => {
    try {
      return JSON.parse(raw);
    } catch (e) {
      setError(t('importPage.badJson', { message: (e as Error).message }));
      return null;
    }
  };

  const validate = async () => {
    setError(null);
    const pkg = parsed();
    if (pkg === null) return;
    setBusy('check');
    try {
      setCheck(await api<Check>('/tests/validate', { body: { package: pkg } }));
    } catch (e) {
      setError(e instanceof ApiError ? errorText(e.code, e.message) : errorText(undefined));
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    setError(null);
    const pkg = parsed();
    if (pkg === null) return;
    setBusy('import');
    try {
      const r = await api<{ id: string }>('/tests/import', { body: { academyId: academy, package: pkg } });
      router.push(`/tests/${r.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? errorText(e.code, e.message) : errorText(undefined));
      setBusy(null);
    }
  };

  if (!me) return <Loading />;
  return (
    <Page>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{t('importPage.title')}</h1>
        <p className="text-muted max-w-3xl">{t('importPage.intro')}</p>
        <p className="text-muted text-xs">{t('importPage.formatDoc')}</p>
      </div>
      <div className="card space-y-4 p-5">
        {academies.length > 1 && (
          <Field label={t('importPage.academy')}>
            <select className="input" value={academy} onChange={(e) => setAcademyId(e.target.value)}>
              {academies.map((a) => (
                <option key={a.academyId} value={a.academyId}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label={t('importPage.file')}>
          <input
            type="file"
            accept="application/json,.json"
            className="block text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#e8edf6] file:px-3 file:py-2 file:font-semibold"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > MAX_MB * 1024 * 1024) return setError(t('importPage.tooBig'));
              setFileName(f.name);
              setCheck(null);
              setRaw(await f.text());
            }}
          />
        </Field>
        <Field label={t('importPage.orPaste')}>
          <textarea
            className="input h-40 font-mono text-xs"
            spellCheck={false}
            value={raw.length > 200_000 ? `${raw.slice(0, 2000)}\n… (${fileName ?? ''}, ${(raw.length / 1024 / 1024).toFixed(1)} MB)` : raw}
            readOnly={raw.length > 200_000}
            onChange={(e) => {
              setCheck(null);
              setFileName(null);
              setRaw(e.target.value);
            }}
          />
        </Field>
        <ErrorBanner message={error} />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void validate()} loading={busy === 'check'} disabled={!raw.trim()}>
            {t('importPage.validate')}
          </Button>
          <Button onClick={() => void save()} loading={busy === 'import'} disabled={!raw.trim() || !academy || (check !== null && !check.ok)}>
            {t('importPage.import')}
          </Button>
        </div>
      </div>
      {check && (
        <div className="card space-y-3 p-5">
          <p className={`text-lg font-bold ${check.ok ? 'text-[#15803d]' : 'text-[#b91c1c]'}`}>
            {check.ok ? `✓ ${t('importPage.valid')}` : `✗ ${t('importPage.invalid')}`}
          </p>
          {check.summary && <Summary s={check.summary} />}
          {check.errors.length > 0 && <p className="font-semibold">{t('importPage.errors', { n: check.errors.length })}</p>}
          <IssueList items={check.errors} tone="error" />
          {check.warnings.length > 0 && <p className="font-semibold">{t('importPage.warnings', { n: check.warnings.length })}</p>}
          <IssueList items={check.warnings} tone="warn" />
        </div>
      )}
    </Page>
  );
}
