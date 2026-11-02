'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { LOCALE_LABELS, LOCALES, useI18n, type Locale } from '@/lib/i18n';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-[#14284b] text-white hover:bg-[#1d3866] dark:bg-[#3b5b9a] dark:hover:bg-[#4a6bab]',
  secondary: 'bg-[#e8edf6] text-[#14284b] hover:bg-[#d8e0ef] dark:bg-[#22355a] dark:text-[#dbe5ff]',
  ghost: 'bg-transparent hover:bg-black/5 dark:hover:bg-white/10',
  danger: 'bg-[#b91c1c] text-white hover:bg-[#991b1b]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  loading,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg'; loading?: boolean }) {
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2', lg: 'px-6 py-3 text-lg' };
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Spinner({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" />
      <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="text-muted block text-xs">{hint}</span>}
    </label>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose(): void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="card m-auto w-[calc(100%-2rem)] max-w-lg p-0 text-[var(--text)] backdrop:bg-black/50"
    >
      {open && (
        <div className="max-h-[85dvh] overflow-y-auto p-5 sm:p-6">
          <h2 className="mb-3 text-lg font-bold">{title}</h2>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function LangSwitch() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="inline-flex rounded-lg bg-black/5 p-0.5 text-xs font-bold dark:bg-white/10">
      {(Object.keys(LOCALES) as Locale[]).map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={`rounded-md px-2 py-1 ${locale === l ? 'bg-white shadow dark:bg-[#3b5b9a]' : ''}`}
        >
          {LOCALE_LABELS[l]}
        </button>
      ))}
    </div>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2 font-extrabold tracking-tight">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#14284b] text-sm text-white dark:bg-[#3b5b9a]">IE</span>
      <span>
        EduPortal <span className="text-[#b4233a]">IELTS</span>
      </span>
    </span>
  );
}

export function AppHeader() {
  const { t } = useI18n();
  const { me, logout } = useAuth();
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--card-border)] bg-[var(--card)]">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <LangSwitch />
          {me && (
            <>
              <span className="hidden text-sm font-medium md:inline">
                {me.user.firstName} {me.user.lastName}
              </span>
              <Button variant="ghost" size="sm" onClick={() => void logout().then(() => router.push('/login?signedOut=1'))}>
                {t('common.logout')}
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function Page({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <>
      <AppHeader />
      <main className={`mx-auto space-y-6 px-4 py-6 ${wide ? 'max-w-7xl' : 'max-w-6xl'}`}>{children}</main>
    </>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <h3 className="text-lg font-bold">{title}</h3>
      {text && <p className="text-muted max-w-md">{text}</p>}
      {action}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#991b1b]">
      {message}
    </div>
  );
}

export function Band({ value }: { value: number | null | undefined }) {
  return <span className="band-pill">{value === null || value === undefined ? '–' : value.toFixed(1)}</span>;
}

export function Loading() {
  return (
    <div className="grid place-items-center py-24">
      <Spinner />
    </div>
  );
}

export const fmtDate = (iso: string | null | undefined, locale: string) =>
  iso ? new Date(iso).toLocaleString(locale === 'az' ? 'az-Latn-AZ' : locale, { dateStyle: 'medium', timeStyle: 'short' }) : '–';
