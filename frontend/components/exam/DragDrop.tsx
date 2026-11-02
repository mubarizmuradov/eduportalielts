'use client';

import { useState } from 'react';
import type { Option } from '@/lib/exam-types';
import { useExam } from './ExamContext';

const MIME = 'application/x-ielts-option';

/**
 * A draggable option (heading, word, sentence ending). Like the IELTS
 * computer test it can be dragged into a gap; it can also be clicked and
 * then the gap clicked (keyboard, touch screens).
 */
export function DragChip({ group, option, used }: { group: number; option: Option; used: boolean }) {
  const { picked, setPicked } = useExam();
  const active = picked?.group === group && picked.key === option.key;
  return (
    <button
      type="button"
      className="ex-chip text-left"
      draggable
      data-used={used}
      aria-pressed={active}
      onDragStart={(e) => {
        e.dataTransfer.setData(MIME, JSON.stringify({ group, key: option.key }));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => setPicked(active ? null : { group, key: option.key })}
    >
      <strong>{option.key}</strong>
      <span>{option.text}</span>
    </button>
  );
}

/** A gap that takes a dragged option. Click a filled gap to empty it. */
export function DropGap({
  n,
  group,
  options,
  showText = true,
  className = '',
}: {
  n: number;
  group: number;
  options: Option[];
  showText?: boolean;
  className?: string;
}) {
  const { answers, setAnswer, picked, setPicked, setCurrent } = useExam();
  const [over, setOver] = useState(false);
  const value = answers[n] ?? '';
  const opt = options.find((o) => o.key === value);
  return (
    <button
      type="button"
      className={`ex-drop ${className}`}
      data-gap={n}
      data-filled={!!opt}
      data-over={over}
      aria-label={`Question ${n}${opt ? `: ${opt.key} ${opt.text}` : ', empty'}`}
      onFocus={() => setCurrent(n)}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(MIME)) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        try {
          const data = JSON.parse(e.dataTransfer.getData(MIME)) as { group: number; key: string };
          if (data.group === group) setAnswer(n, data.key);
        } catch {
          /* not ours */
        }
        setCurrent(n);
      }}
      onClick={() => {
        setCurrent(n);
        if (picked && picked.group === group) {
          setAnswer(n, picked.key);
          setPicked(null);
        } else if (opt) setAnswer(n, '');
      }}
    >
      {opt ? (
        <span>
          <strong>{opt.key}</strong>
          {showText ? ` ${opt.text}` : ''}
        </span>
      ) : (
        <strong>{n}</strong>
      )}
    </button>
  );
}
