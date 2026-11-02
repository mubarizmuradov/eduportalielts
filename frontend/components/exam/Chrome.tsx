'use client';

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';

export type ContrastMode = 'bw' | 'wb' | 'yb';
export type TextSize = 'standard' | 'large' | 'xlarge';
export interface ExamSettings {
  contrast: ContrastMode;
  size: TextSize;
}

const SETTINGS_KEY = 'eduielts.exam-settings';

const DEFAULT_SETTINGS: ExamSettings = { contrast: 'bw', size: 'standard' };
const settingsListeners = new Set<() => void>();
let settingsCache: ExamSettings | null = null;

function readSettings(): ExamSettings {
  if (settingsCache) return settingsCache;
  try {
    settingsCache = (JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null') as ExamSettings | null) ?? DEFAULT_SETTINGS;
  } catch {
    settingsCache = DEFAULT_SETTINGS;
  }
  return settingsCache;
}

/** Text size and colour mode, kept in this browser (like the test's Settings menu). */
export function useExamSettings(): [ExamSettings, (s: ExamSettings) => void] {
  const s = useSyncExternalStore(
    (cb) => {
      settingsListeners.add(cb);
      return () => settingsListeners.delete(cb);
    },
    readSettings,
    () => DEFAULT_SETTINGS,
  );
  return [
    s,
    (next) => {
      settingsCache = next;
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      settingsListeners.forEach((cb) => cb());
    },
  ];
}

/** Remaining time of the server deadline; turns red in the last 5 minutes like the real test. */
export function Timer({ deadline, skewMs, onExpire }: { deadline: string | null; skewMs: number; onExpire?(): void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  const left = deadline ? Math.max(0, new Date(deadline).getTime() - (now + skewMs)) : 1;
  const expired = left === 0;
  useEffect(() => {
    // fires once per deadline
    if (expired && onExpire) onExpire();
  }, [expired, deadline]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!deadline) return null;
  const mins = Math.floor(left / 60000);
  const secs = Math.floor((left % 60000) / 1000);
  const red = left <= 5 * 60_000;
  return (
    <span role="timer" aria-live={left < 60_000 ? 'polite' : 'off'} className={`font-bold tabular-nums ${red ? 'text-[#d00000]' : ''}`}>
      {left >= 10 * 60_000 ? `${mins + (secs > 0 ? 1 : 0)} minutes left` : `${mins}:${String(secs).padStart(2, '0')} left`}
    </span>
  );
}

function IconButton({ label, onClick, children, pressed }: { label: string; onClick(): void; children: ReactNode; pressed?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className="flex items-center gap-1 rounded px-2 py-1 text-[0.85em] font-bold hover:bg-black/10"
    >
      {children}
    </button>
  );
}

/** Top bar of the computer-delivered test: candidate, timer, volume, settings, help, hide. */
export function ExamHeader({
  candidate,
  timer,
  status,
  settings,
  onSettings,
  volume,
  onVolume,
  help,
}: {
  candidate: { name: string; number: string };
  timer?: ReactNode;
  status?: ReactNode;
  settings: ExamSettings;
  onSettings(s: ExamSettings): void;
  volume?: number;
  onVolume?(v: number): void;
  help: ReactNode;
}) {
  const [open, setOpen] = useState<'settings' | 'help' | null>(null);
  const [hidden, setHidden] = useState(false);
  return (
    <>
      <header className="ex-bar ex-border relative z-30 flex min-h-12 flex-wrap items-center gap-x-4 gap-y-1 border-b px-3 py-1.5">
        <div className="min-w-0">
          <div className="truncate text-[0.95em] font-bold">{candidate.name}</div>
          <div className="ex-muted text-[0.8em]">Candidate number {candidate.number}</div>
        </div>
        <div className="mx-auto flex items-center gap-3">
          {timer}
          {status}
        </div>
        <div className="ml-auto flex items-center gap-1">
          {onVolume && (
            <label className="flex items-center gap-1 text-[0.85em] font-bold">
              <span aria-hidden>🔊</span>
              <span className="sr-only">Volume</span>
              <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => onVolume(Number(e.target.value))} className="w-24" />
            </label>
          )}
          <IconButton label="Settings" onClick={() => setOpen(open === 'settings' ? null : 'settings')} pressed={open === 'settings'}>
            ⚙ <span className="hidden sm:inline">Settings</span>
          </IconButton>
          <IconButton label="Help" onClick={() => setOpen(open === 'help' ? null : 'help')} pressed={open === 'help'}>
            ? <span className="hidden sm:inline">Help</span>
          </IconButton>
          <IconButton label="Hide" onClick={() => setHidden(true)}>
            ◐ <span className="hidden sm:inline">Hide</span>
          </IconButton>
        </div>
        {open && (
          <div className="ex-bar ex-border absolute top-full right-2 z-40 mt-1 w-80 rounded border p-4 shadow-xl">
            {open === 'settings' ? (
              <div className="space-y-4">
                <fieldset>
                  <legend className="mb-1 font-bold">Text size</legend>
                  {(
                    [
                      ['standard', 'Standard'],
                      ['large', 'Large'],
                      ['xlarge', 'Extra large'],
                    ] as const
                  ).map(([v, l]) => (
                    <label key={v} className="flex items-center gap-2">
                      <input type="radio" name="size" checked={settings.size === v} onChange={() => onSettings({ ...settings, size: v })} /> {l}
                    </label>
                  ))}
                </fieldset>
                <fieldset>
                  <legend className="mb-1 font-bold">Colours</legend>
                  {(
                    [
                      ['bw', 'Black on white'],
                      ['wb', 'White on black'],
                      ['yb', 'Yellow on black'],
                    ] as const
                  ).map(([v, l]) => (
                    <label key={v} className="flex items-center gap-2">
                      <input type="radio" name="contrast" checked={settings.contrast === v} onChange={() => onSettings({ ...settings, contrast: v })} /> {l}
                    </label>
                  ))}
                </fieldset>
                <button className="ex-border w-full rounded border py-1 font-bold" onClick={() => setOpen(null)}>
                  OK
                </button>
              </div>
            ) : (
              <div className="space-y-2 text-[0.9em]">
                {help}
                <button className="ex-border mt-2 w-full rounded border py-1 font-bold" onClick={() => setOpen(null)}>
                  OK
                </button>
              </div>
            )}
          </div>
        )}
      </header>
      {hidden && (
        <div className="fixed inset-0 z-50 grid place-items-center" style={{ background: 'var(--ex-bg)' }}>
          <div className="space-y-3 text-center">
            <p className="text-[1.2em] font-bold">Your screen is hidden.</p>
            <p className="ex-muted">The timer is still running.</p>
            <button className="ex-border rounded border px-6 py-2 font-bold" onClick={() => setHidden(false)} autoFocus>
              Show screen
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export interface NavPart {
  label: string;
  numbers: number[];
}

/**
 * Bottom navigation of the computer test: every part with its question
 * numbers (underlined = answered, round = marked for review), the Review
 * flag for the current question, previous / next and submit.
 */
export function NavBar({
  parts,
  activePart,
  current,
  answered,
  review,
  onGo,
  onToggleReview,
  onSubmit,
  submitLabel = 'Submit',
}: {
  parts: NavPart[];
  activePart: number;
  current: number | null;
  answered(n: number): boolean;
  review: Set<number>;
  onGo(n: number, part: number): void;
  onToggleReview?(n: number): void;
  onSubmit(): void;
  submitLabel?: string;
}) {
  const flat = parts.flatMap((p, pi) => p.numbers.map((n) => ({ n, pi })));
  const idx = flat.findIndex((x) => x.n === current);
  const go = (d: number) => {
    const t = flat[Math.min(flat.length - 1, Math.max(0, (idx < 0 ? 0 : idx) + d))];
    if (t) onGo(t.n, t.pi);
  };
  return (
    <nav aria-label="Questions" className="ex-bar ex-border relative z-20 flex flex-wrap items-center gap-2 border-t px-2 py-1.5">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        {parts.map((p, pi) =>
          pi === activePart ? (
            <div key={pi} className="flex flex-wrap items-center gap-1">
              <span className="mr-1 font-bold">{p.label}</span>
              {p.numbers.map((n) => (
                <button
                  key={n}
                  className="ex-navbtn"
                  data-answered={answered(n)}
                  data-current={current === n}
                  data-review={review.has(n)}
                  aria-label={`Question ${n}${answered(n) ? ', answered' : ''}${review.has(n) ? ', marked for review' : ''}`}
                  aria-current={current === n ? 'true' : undefined}
                  onClick={() => onGo(n, pi)}
                >
                  {n}
                </button>
              ))}
            </div>
          ) : (
            <button key={pi} className="rounded px-2 py-1 text-[0.9em] hover:bg-black/10" onClick={() => onGo(p.numbers[0], pi)}>
              <span className="font-bold">{p.label}</span>{' '}
              <span className="ex-muted">
                {p.numbers.filter(answered).length} of {p.numbers.length}
              </span>
            </button>
          ),
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {onToggleReview && current !== null && (
          <label className="mr-1 flex cursor-pointer items-center gap-1.5 text-[0.9em] font-bold">
            <input type="checkbox" checked={review.has(current)} onChange={() => onToggleReview(current)} />
            Review
          </label>
        )}
        <button aria-label="Previous question" className="ex-navbtn !h-9 !w-11 text-lg" onClick={() => go(-1)} disabled={idx <= 0}>
          ←
        </button>
        <button aria-label="Next question" className="ex-navbtn !h-9 !w-11 text-lg" onClick={() => go(1)} disabled={idx >= flat.length - 1}>
          →
        </button>
        <button className="ml-1 rounded bg-[var(--ex-accent)] px-3 py-1.5 font-bold text-[var(--ex-bg)]" onClick={onSubmit}>
          ✓ {submitLabel}
        </button>
      </div>
    </nav>
  );
}

/** Simple confirm dialog in the exam style. */
export function ExamDialog({ open, title, children, onCancel, onConfirm, confirmLabel }: { open: boolean; title: string; children: ReactNode; onCancel?(): void; onConfirm(): void; confirmLabel: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="ex-border w-full max-w-md rounded border p-5 shadow-2xl" style={{ background: 'var(--ex-bg)' }}>
        <h2 className="mb-2 text-[1.15em] font-bold">{title}</h2>
        <div className="mb-4">{children}</div>
        <div className="flex justify-end gap-2">
          {onCancel && (
            <button className="ex-border rounded border px-4 py-1.5 font-bold" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button className="rounded bg-[var(--ex-accent)] px-4 py-1.5 font-bold text-[var(--ex-bg)]" onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
