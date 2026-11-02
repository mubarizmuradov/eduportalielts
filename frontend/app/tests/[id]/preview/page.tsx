'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ExamHeader, useExamSettings } from '@/components/exam/Chrome';
import { QuestionModule, WritingModule } from '@/components/exam/Modules';
import { Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import { assetUrl, type Module } from '@/lib/exam-types';
import type { TestDetail } from '@/lib/types';

/** Staff preview of the candidate screens. Answers stay in the browser; nothing is saved or timed. */
export default function PreviewPage() {
  const { me } = useRequireAuth();
  const { id } = useParams<{ id: string }>();
  const [settings, setSettings] = useExamSettings();
  const [test, setTest] = useState<TestDetail | null>(null);
  const [module, setModule] = useState<Module>('listening');
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (me) void api<TestDetail>(`/tests/${id}`).then(setTest);
  }, [me, id]);

  const root = { className: 'ielts flex h-dvh flex-col overflow-hidden', 'data-contrast': settings.contrast, 'data-size': settings.size };
  if (!test)
    return (
      <div {...root}>
        <div className="m-auto">
          <Spinner />
        </div>
      </div>
    );
  const c = test.candidate;
  const restart = () => setRound((r) => r + 1);

  return (
    <div {...root}>
      <ExamHeader
        candidate={{ name: 'Preview', number: '000000' }}
        settings={settings}
        onSettings={setSettings}
        help={<p>Staff preview: answers are not saved and there is no timer.</p>}
        status={
          <span className="flex flex-wrap items-center gap-1 text-[0.85em]">
            {(['listening', 'reading', 'writing', 'speaking'] as Module[]).map((m) => (
              <button
                key={m}
                onClick={() => setModule(m)}
                className={`rounded px-2 py-0.5 font-bold capitalize ${module === m ? 'bg-[var(--ex-accent)] text-[var(--ex-bg)]' : 'hover:bg-black/10'}`}
              >
                {m}
              </button>
            ))}
            <Link href={`/tests/${id}`} className="ml-2 underline">
              Exit preview
            </Link>
          </span>
        }
      />
      {module === 'listening' && (
        <div className="ex-bar ex-border flex flex-wrap items-center gap-3 border-b px-3 py-1 text-[0.85em]">
          {c.listening.parts.map((p) => (
            <span key={p.partNumber} className="flex items-center gap-1">
              Part {p.partNumber}
              <audio controls preload="none" src={assetUrl(test.id, p.audio)} className="h-7 w-52" />
            </span>
          ))}
        </div>
      )}
      {(module === 'listening' || module === 'reading') && (
        <QuestionModule
          key={`${module}-${round}`}
          kind={module}
          testId={test.id}
          content={module === 'listening' ? c.listening : c.reading}
          initialAnswers={{}}
          storageKey={`preview:${test.id}:${module}`}
          onAnswers={() => undefined}
          onSubmit={restart}
          preview
        />
      )}
      {module === 'writing' && (
        <WritingModule key={round} content={c.writing} testId={test.id} initial={['', '']} onTexts={() => undefined} onSubmit={restart} preview />
      )}
      {module === 'speaking' && (
        <div className="mx-auto w-full max-w-3xl space-y-4 overflow-y-auto p-6">
          <p>Candidates record each answer with their microphone. Part 1 answers: {c.speaking.part1.answerSeconds}s, Part 2: {c.speaking.part2.prepSeconds}s preparation + {c.speaking.part2.talkSeconds}s talk, Part 3 answers: {c.speaking.part3.answerSeconds}s.</p>
          <div className="ex-border mx-auto max-w-lg rounded border p-5">
            <p className="mb-2 font-bold">{c.speaking.part2.topic}</p>
            <p>You should say:</p>
            <ul className="mb-2 list-disc pl-6">
              {c.speaking.part2.bulletPoints.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <p>{c.speaking.part2.finalPrompt}</p>
          </div>
        </div>
      )}
    </div>
  );
}
