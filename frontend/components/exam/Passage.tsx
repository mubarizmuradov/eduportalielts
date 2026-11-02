'use client';

import { useCallback, useRef, useState } from 'react';
import { assetUrl, type Group, type ReadingText } from '@/lib/exam-types';
import { DropGap } from './DragDrop';
import { useExam } from './ExamContext';

/** A highlighted stretch of one paragraph (character offsets), optionally with a note. */
interface Highlight {
  start: number;
  end: number;
  note?: string;
}
type Highlights = Record<string, Highlight[]>;

interface Menu {
  x: number;
  y: number;
  para: string;
  start: number;
  end: number;
  /** index of an existing highlight that was clicked */
  existing?: number;
}

function load(key: string): Highlights {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}') as Highlights;
  } catch {
    return {};
  }
}

function offsetIn(root: Node, node: Node, offset: number) {
  const r = document.createRange();
  r.selectNodeContents(root);
  r.setEnd(node, offset);
  return r.toString().length;
}

/** Merges a new range into a paragraph's highlights. */
function addRange(list: Highlight[], h: Highlight): Highlight[] {
  const all = [...list, h].sort((x, y) => x.start - y.start);
  const out: Highlight[] = [];
  for (const cur of all) {
    const last = out[out.length - 1];
    if (last && cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
      last.note = [last.note, cur.note].filter(Boolean).join(' / ') || undefined;
    } else out.push({ ...cur });
  }
  return out;
}

function Paragraph({ id, text, highlights, onPick }: { id: string; text: string; highlights: Highlight[]; onPick(i: number, el: HTMLElement): void }) {
  const parts: React.ReactNode[] = [];
  let pos = 0;
  highlights.forEach((h, i) => {
    if (h.start > pos) parts.push(<span key={`t${i}`}>{text.slice(pos, h.start)}</span>);
    parts.push(
      <mark
        key={`h${i}`}
        className="ex-hl"
        data-note={!!h.note}
        title={h.note}
        onClick={(e) => onPick(i, e.currentTarget)}
      >
        {text.slice(h.start, h.end)}
      </mark>,
    );
    pos = h.end;
  });
  if (pos < text.length) parts.push(<span key="end">{text.slice(pos)}</span>);
  return <span data-para={id}>{parts}</span>;
}

/**
 * Reading passage with the computer-test tools: select text to highlight it or
 * add a note; click a highlight to change or clear it. Highlights stay in this
 * browser only. Matching-heading gaps sit at the top of their paragraphs.
 */
export function Passage({ texts, groups, storageKey }: { texts: ReadingText[]; groups: Group[]; storageKey: string }) {
  const { testId } = useExam();
  // Remounted per part (React key), so the initial load is enough.
  const [hl, setHl] = useState<Highlights>(() => load(storageKey));
  const [menu, setMenu] = useState<Menu | null>(null);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const save = useCallback(
    (next: Highlights) => {
      setHl(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* storage full or blocked: highlights just are not kept */
      }
    },
    [storageKey],
  );

  const headingGaps = new Map<string, { n: number; group: Extract<Group, { type: 'matching_headings' }> }>();
  for (const g of groups)
    if (g.type === 'matching_headings') for (const q of g.questions) headingGaps.set(`${g.textIndex}:${q.paragraph}`, { n: q.number, group: g });

  const onMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const startEl = (range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement) as Element | null;
    const endEl = (range.endContainer.nodeType === 1 ? range.endContainer : range.endContainer.parentElement) as Element | null;
    const pa = startEl?.closest('[data-para]');
    const pb = endEl?.closest('[data-para]');
    if (!pa || pa !== pb || !box.current) return;
    const start = offsetIn(pa, range.startContainer, range.startOffset);
    const end = offsetIn(pa, range.endContainer, range.endOffset);
    if (end <= start) return;
    const rect = range.getBoundingClientRect();
    const outer = box.current.getBoundingClientRect();
    setNoteDraft(null);
    setMenu({ x: rect.left - outer.left + rect.width / 2, y: rect.bottom - outer.top + box.current.scrollTop + 6, para: pa.getAttribute('data-para')!, start, end });
  };

  const pick = (para: string) => (i: number, el: HTMLElement) => {
    if (!box.current) return;
    const rect = el.getBoundingClientRect();
    const outer = box.current.getBoundingClientRect();
    const h = hl[para][i];
    setNoteDraft(null);
    setMenu({ x: rect.left - outer.left + rect.width / 2, y: rect.bottom - outer.top + box.current.scrollTop + 6, para, start: h.start, end: h.end, existing: i });
  };

  const highlight = (note?: string) => {
    if (!menu) return;
    const list = hl[menu.para] ?? [];
    const next =
      menu.existing !== undefined
        ? list.map((h, i) => (i === menu.existing ? { ...h, note: note || undefined } : h))
        : addRange(list, { start: menu.start, end: menu.end, note });
    save({ ...hl, [menu.para]: next });
    window.getSelection()?.removeAllRanges();
    setMenu(null);
  };
  const clear = () => {
    if (!menu) return;
    const list = hl[menu.para] ?? [];
    save({ ...hl, [menu.para]: list.filter((h) => h.end <= menu.start || h.start >= menu.end) });
    setMenu(null);
  };

  return (
    <div ref={box} className="relative" onMouseUp={onMouseUp}>
      {texts.map((t, ti) => (
        <article key={ti} className={ti > 0 ? 'ex-border mt-8 border-t pt-6' : ''}>
          <h2 className="mb-1 text-center text-[1.25em] font-bold">
            {t.label && <span className="mr-2">{t.label}</span>}
            {t.title}
          </h2>
          {t.subtitle && <p className="ex-muted mb-3 text-center italic">{t.subtitle}</p>}
          {t.image && (
            <figure className="my-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={assetUrl(testId, t.image)} alt={t.imageCaption ?? ''} className="mx-auto max-w-full" />
              {t.imageCaption && <figcaption className="ex-muted text-center text-sm">{t.imageCaption}</figcaption>}
            </figure>
          )}
          <div className="space-y-3">
            {t.paragraphs.map((p, pi) => {
              const id = `${ti}-${pi}`;
              const gap = p.label ? headingGaps.get(`${ti}:${p.label}`) : undefined;
              return (
                <div key={pi}>
                  {gap && (
                    <div className="mb-1">
                      <DropGap n={gap.n} group={gap.group.range[0]} options={gap.group.headings} />
                    </div>
                  )}
                  <p className="flex gap-3">
                    {p.label && <strong className="select-none">{p.label}</strong>}
                    <span className="flex-1">
                      <Paragraph id={id} text={p.text} highlights={hl[id] ?? []} onPick={pick(id)} />
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
          {t.glossary && t.glossary.length > 0 && (
            <dl className="ex-border mt-4 border-t pt-2 text-[0.9em]">
              {t.glossary.map((g) => (
                <div key={g.term} className="flex gap-1">
                  <dt className="font-bold">*{g.term}:</dt>
                  <dd>{g.definition}</dd>
                </div>
              ))}
            </dl>
          )}
        </article>
      ))}

      {menu && (
        <div
          role="menu"
          className="ex-bar ex-border absolute z-20 -translate-x-1/2 rounded border p-1 shadow-lg"
          style={{ left: menu.x, top: menu.y }}
          onMouseUp={(e) => e.stopPropagation()}
        >
          {noteDraft === null ? (
            <div className="flex gap-1 text-[0.9em]">
              {menu.existing === undefined && (
                <button role="menuitem" className="rounded px-2 py-1 hover:bg-black/10" onClick={() => highlight()}>
                  Highlight
                </button>
              )}
              <button
                role="menuitem"
                className="rounded px-2 py-1 hover:bg-black/10"
                onClick={() => setNoteDraft(menu.existing !== undefined ? (hl[menu.para][menu.existing].note ?? '') : '')}
              >
                Notes
              </button>
              <button role="menuitem" className="rounded px-2 py-1 hover:bg-black/10" onClick={clear}>
                Clear
              </button>
              <button role="menuitem" aria-label="Close" className="rounded px-2 py-1 hover:bg-black/10" onClick={() => setMenu(null)}>
                ×
              </button>
            </div>
          ) : (
            <div className="w-64 space-y-1 p-1">
              <textarea
                autoFocus
                rows={3}
                className="ex-writing w-full rounded p-1 text-[0.9em]"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                aria-label="Note"
              />
              <div className="flex justify-end gap-1 text-[0.9em]">
                <button className="rounded px-2 py-1 hover:bg-black/10" onClick={() => setMenu(null)}>
                  Cancel
                </button>
                <button className="rounded px-2 py-1 font-bold hover:bg-black/10" onClick={() => highlight(noteDraft.trim())}>
                  Save note
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

