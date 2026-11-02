'use client';

import { createContext, useContext } from 'react';
import type { Answers } from '@/lib/exam-types';

/** A word-bank / heading / ending chip picked with a click (keyboard and touch friendly drag & drop). */
export interface Picked {
  group: number;
  key: string;
}

export interface ExamCtx {
  testId: string;
  answers: Answers;
  setAnswer(n: number, value: string): void;
  current: number | null;
  setCurrent(n: number): void;
  picked: Picked | null;
  setPicked(p: Picked | null): void;
  /** Staff preview: answers stay in the browser. */
  preview?: boolean;
}

export const ExamContext = createContext<ExamCtx | null>(null);

export function useExam() {
  const ctx = useContext(ExamContext);
  if (!ctx) throw new Error('useExam outside ExamContext');
  return ctx;
}

/** Wrapper of one question: marks it current on focus/click and is the scroll target of the navigation bar. */
export function Q({ n, children, className = '' }: { n: number; children: React.ReactNode; className?: string }) {
  const { current, setCurrent } = useExam();
  return (
    <div
      id={`q-${n}`}
      data-q={n}
      data-active={current === n}
      onFocusCapture={() => setCurrent(n)}
      onMouseDown={() => setCurrent(n)}
      className={`ex-q scroll-mt-24 px-1 py-1 ${className}`}
    >
      {children}
    </div>
  );
}

export function scrollToQuestion(n: number) {
  const el = document.getElementById(`q-${n}`) ?? document.querySelector<HTMLElement>(`[data-gap="${n}"]`);
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  const focusable = el.matches('input,select,button,textarea')
    ? el
    : el.querySelector<HTMLElement>('input:not([disabled]),select,button.ex-drop,textarea');
  focusable?.focus({ preventScroll: true });
}
