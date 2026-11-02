'use client';

import { useI18n } from '@/lib/i18n';
import type { BuildIssue, ExamSummary } from '@/lib/types';

export function Summary({ s }: { s: ExamSummary }) {
  const { t } = useI18n();
  const types = (x: Partial<Record<string, number>>) =>
    Object.entries(x)
      .map(([k, v]) => `${k.replace(/_/g, ' ')} ×${v}`)
      .join(', ');
  return (
    <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[9rem_1fr]">
      <dt className="font-semibold">{t('common.listening')}</dt>
      <dd>
        {t('common.questions', { n: s.listening.questions })} · {Math.round(s.listening.audioSeconds / 60)} min audio — {types(s.listening.types)}
      </dd>
      <dt className="font-semibold">{t('common.reading')}</dt>
      <dd>
        {t('common.questions', { n: s.reading.questions })} · {s.reading.texts} texts · {s.reading.words} words — {types(s.reading.types)}
      </dd>
      <dt className="font-semibold">{t('common.writing')}</dt>
      <dd>
        Task 1: {s.writing.task1.replace(/_/g, ' ')} · Task 2: {s.writing.task2.replace(/_/g, ' ')}
      </dd>
      <dt className="font-semibold">{t('common.speaking')}</dt>
      <dd>
        Part 1: {s.speaking.part1Questions} · Part 2: cue card · Part 3: {s.speaking.part3Questions}
      </dd>
    </dl>
  );
}

export function IssueList({ items, tone }: { items: BuildIssue[]; tone: 'error' | 'warn' }) {
  if (items.length === 0) return null;
  return (
    <ul className={`max-h-80 space-y-1 overflow-y-auto rounded-lg border p-3 font-mono text-xs ${tone === 'error' ? 'border-[#fecaca] bg-[#fef2f2] text-[#7f1d1d]' : 'border-[#fde68a] bg-[#fffbeb] text-[#78350f]'}`}>
      {items.map((i, k) => (
        <li key={k}>
          <span className="font-bold">{i.path || '(package)'}</span>: {i.message}
        </li>
      ))}
    </ul>
  );
}
