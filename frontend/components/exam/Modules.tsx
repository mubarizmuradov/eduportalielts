'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { assetUrl, type Answers, type ListeningContent, type ReadingContent, type WritingContent } from '@/lib/exam-types';
import { ExamDialog, NavBar, type NavPart } from './Chrome';
import { ExamContext, scrollToQuestion, type Picked } from './ExamContext';
import { Passage } from './Passage';
import { QuestionGroup } from './QuestionGroup';
import { RichText, inline } from './RichText';

/** Questions ticked "Review" (kept in this browser). Mount with a new React key when `key` changes. */
function useReviewFlags(key: string) {
  const [review, setReview] = useState<Set<number>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(key) ?? '[]') as number[]);
    } catch {
      return new Set();
    }
  });
  const toggle = (n: number) =>
    setReview((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      try {
        localStorage.setItem(key, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  return [review, toggle] as const;
}

/** Drag-resizable two-column layout (passage | questions), like the computer test. */
export function SplitPane({ left, right }: { left: ReactNode; right: ReactNode }) {
  const [pct, setPct] = useState(50);
  const box = useRef<HTMLDivElement>(null);
  const drag = (e: React.PointerEvent) => {
    e.preventDefault();
    const move = (ev: PointerEvent) => {
      const r = box.current?.getBoundingClientRect();
      if (r) setPct(Math.min(75, Math.max(25, ((ev.clientX - r.left) / r.width) * 100)));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return (
    <div ref={box} className="flex min-h-0 flex-1 flex-col md:flex-row">
      <div className="min-h-0 overflow-y-auto p-5 md:h-full" style={{ flexBasis: `${pct}%` }}>
        {left}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize"
        tabIndex={0}
        onPointerDown={drag}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setPct((p) => Math.max(25, p - 5));
          if (e.key === 'ArrowRight') setPct((p) => Math.min(75, p + 5));
        }}
        className="ex-resize hidden w-1.5 shrink-0 md:block"
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-5 md:h-full">{right}</div>
    </div>
  );
}

function PartBanner({ title, text }: { title: string; text: string }) {
  return (
    <div className="ex-part-banner mx-3 mt-3">
      <p className="font-bold">{title}</p>
      <div>{inline(text)}</div>
    </div>
  );
}

interface QuestionModuleProps {
  kind: 'listening' | 'reading';
  content: ListeningContent | ReadingContent;
  testId: string;
  initialAnswers: Answers;
  storageKey: string;
  /** Called on every change (autosave). */
  onAnswers(a: Answers): void;
  onSubmit(): void;
  /** Listening: the part being played; the view follows it. */
  followPart?: number | null;
  preview?: boolean;
}

/** Listening or Reading: parts, questions, navigation bar, review flags and submit. */
export function QuestionModule({ kind, content, testId, initialAnswers, storageKey, onAnswers, onSubmit, followPart, preview }: QuestionModuleProps) {
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [current, setCurrent] = useState<number | null>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [activePart, setActivePart] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [review, toggleReview] = useReviewFlags(`${storageKey}:review`);
  const onAnswersRef = useRef(onAnswers);
  useEffect(() => {
    onAnswersRef.current = onAnswers;
  });

  const parts: NavPart[] = useMemo(
    () =>
      kind === 'listening'
        ? (content as ListeningContent).parts.map((p) => ({ label: `Part ${p.partNumber}`, numbers: p.questionGroups.flatMap((g) => g.numbers) }))
        : (content as ReadingContent).sections.map((s) => ({ label: `Part ${s.sectionNumber}`, numbers: s.questionGroups.flatMap((g) => g.numbers) })),
    [kind, content],
  );

  // Listening: when the next recording starts, show its part.
  const [followed, setFollowed] = useState(followPart);
  if (followPart !== followed) {
    setFollowed(followPart);
    if (followPart !== null && followPart !== undefined) setActivePart(followPart);
  }

  const setAnswer = useCallback((n: number, value: string) => {
    setAnswers((prev) => {
      const next: Answers = { ...prev, [n]: value };
      if (!value) delete next[n];
      onAnswersRef.current(next);
      return next;
    });
  }, []);

  const go = (n: number, part: number) => {
    setActivePart(part);
    setCurrent(n);
    setTimeout(() => scrollToQuestion(n), 30);
  };

  const unanswered = parts.flatMap((p) => p.numbers).filter((n) => !answers[n]).length;
  const ctx = { testId, answers, setAnswer, current, setCurrent, picked, setPicked, preview };

  let body: ReactNode;
  if (kind === 'listening') {
    const part = (content as ListeningContent).parts[activePart];
    body = (
      <>
        <PartBanner title={`Part ${part.partNumber}`} text={part.intro} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl space-y-8 p-5">
            {part.questionGroups.map((g) => (
              <QuestionGroup key={g.range[0]} g={g} />
            ))}
          </div>
        </div>
      </>
    );
  } else {
    const section = (content as ReadingContent).sections[activePart];
    body = (
      <>
        <PartBanner title={`Part ${section.sectionNumber}`} text={section.intro} />
        <SplitPane
          left={<Passage key={activePart} texts={section.texts} groups={section.questionGroups} storageKey={`${storageKey}:hl:${activePart}`} />}
          right={
            <div className="space-y-8">
              {section.questionGroups.map((g) => (
                <QuestionGroup key={g.range[0]} g={g} />
              ))}
            </div>
          }
        />
      </>
    );
  }

  return (
    <ExamContext.Provider value={ctx}>
      <div className="flex min-h-0 flex-1 flex-col">{body}</div>
      <NavBar
        parts={parts}
        activePart={activePart}
        current={current}
        answered={(n) => !!answers[n]}
        review={review}
        onGo={go}
        onToggleReview={toggleReview}
        onSubmit={() => setConfirm(true)}
        submitLabel={preview ? 'Finish preview' : 'Submit'}
      />
      <ExamDialog
        open={confirm}
        title={`Submit ${kind === 'listening' ? 'Listening' : 'Reading'}?`}
        confirmLabel="Submit"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          onSubmit();
        }}
      >
        <p>
          {unanswered > 0
            ? `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}.`
            : 'You have answered all questions.'}{' '}
          You will not be able to come back to this section.
        </p>
      </ExamDialog>
    </ExamContext.Provider>
  );
}

const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Writing: task prompt on the left, answer box with word count on the right. */
export function WritingModule({
  content,
  testId,
  initial,
  onTexts,
  onSubmit,
  preview,
}: {
  content: WritingContent;
  testId: string;
  initial: [string, string];
  onTexts(t: [string, string]): void;
  onSubmit(): void;
  preview?: boolean;
}) {
  const [texts, setTexts] = useState<[string, string]>(initial);
  const [active, setActive] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const task = content.tasks[active];
  const set = (v: string) => {
    const next: [string, string] = active === 0 ? [v, texts[1]] : [texts[0], v];
    setTexts(next);
    onTexts(next);
  };
  return (
    <>
      <PartBanner
        title={`Part ${task.taskNumber}`}
        text={`You should spend about ${task.minutes} minutes on this task. Write at least ${task.minWords} words.`}
      />
      <SplitPane
        left={
          <div className="space-y-3">
            <RichText text={task.body.replace(/^You should spend about \d+ minutes on this task\.\n\n/, '')} />
            {task.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={assetUrl(testId, task.image)} alt="Task 1 visual" className="ex-border max-w-full border" />
            )}
          </div>
        }
        right={
          <div className="flex h-full min-h-[50vh] flex-col gap-2">
            <textarea
              key={active}
              className="ex-writing min-h-[45vh] w-full flex-1 resize-none rounded p-3"
              aria-label={`Task ${task.taskNumber} answer`}
              value={texts[active]}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              onChange={(e) => set(e.target.value)}
              // Like the real test: cut/copy/paste works inside your own answers only.
              onPaste={(e) => {
                const pasted = e.clipboardData.getData('text');
                if (pasted && !texts.join('\n').includes(pasted)) e.preventDefault();
              }}
              onDrop={(e) => e.preventDefault()}
            />
            <p className="text-right text-[0.9em] font-bold">Words: {countWords(texts[active])}</p>
          </div>
        }
      />
      <NavBar
        parts={content.tasks.map((t) => ({ label: `Part ${t.taskNumber}`, numbers: [t.taskNumber] }))}
        activePart={active}
        current={task.taskNumber}
        answered={(n) => countWords(texts[n - 1]) > 0}
        review={new Set()}
        onGo={(_n, part) => setActive(part)}
        onSubmit={() => setConfirm(true)}
        submitLabel={preview ? 'Finish preview' : 'Submit'}
      />
      <ExamDialog
        open={confirm}
        title="Submit Writing?"
        confirmLabel="Submit"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          onSubmit();
        }}
      >
        <p>
          Task 1: {countWords(texts[0])} words, Task 2: {countWords(texts[1])} words. You will not be able to change your answers.
        </p>
      </ExamDialog>
    </>
  );
}
