import { Fragment, type ReactNode } from 'react';

/** "**bold**" → <strong>. Everything else is plain text (never HTML). */
export function inline(text: string, keyPrefix = 'i'): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={`${keyPrefix}${i}`}>{part.slice(2, -2)}</strong>
    ) : (
      <Fragment key={`${keyPrefix}${i}`}>{part}</Fragment>
    ),
  );
}

/**
 * Text with {{n}} gaps: every gap is replaced by renderGap(n).
 * Bold markers work around the gaps too.
 */
export function withGaps(text: string, renderGap: (n: number) => ReactNode, keyPrefix = 'g'): ReactNode[] {
  return text.split(/(\{\{\s*\d+\s*\}\})/g).map((part, i) => {
    const m = /^\{\{\s*(\d+)\s*\}\}$/.exec(part);
    return m ? <Fragment key={`${keyPrefix}${i}`}>{renderGap(Number(m[1]))}</Fragment> : <Fragment key={`${keyPrefix}${i}`}>{inline(part, `${keyPrefix}${i}-`)}</Fragment>;
  });
}

/** Paragraphs (blank line), bullet lines ("- "), line breaks, **bold**. */
export function RichText({ text, className = '' }: { text: string; className?: string }) {
  const blocks = text.split(/\n\s*\n/);
  return (
    <div className={`space-y-2 ${className}`}>
      {blocks.map((block, bi) => {
        const lines = block.split('\n');
        if (lines.every((l) => l.startsWith('- ')))
          return (
            <ul key={bi} className="list-disc space-y-0.5 pl-6">
              {lines.map((l, li) => (
                <li key={li}>{inline(l.slice(2))}</li>
              ))}
            </ul>
          );
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {l.startsWith('- ') ? <>• {inline(l.slice(2))}</> : inline(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
