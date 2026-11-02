'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { az } from './az';
import { en, type Messages } from './en';
import { tr } from './tr';

export const LOCALES = { az, tr, en } as const;
export type Locale = keyof typeof LOCALES;
export const LOCALE_LABELS: Record<Locale, string> = { az: 'AZ', tr: 'TR', en: 'EN' };

type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];
export type MessageKey = Paths<Messages>;

const STORAGE_KEY = 'eduielts.locale';

function lookup(messages: Messages, key: string): string {
  let cur: unknown = messages;
  for (const part of key.split('.')) cur = (cur as Record<string, unknown> | undefined)?.[part];
  return typeof cur === 'string' ? cur : key;
}

export function format(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

interface I18nValue {
  locale: Locale;
  setLocale(l: Locale): void;
  t(key: MessageKey, vars?: Record<string, string | number>): string;
  /** For dynamic keys (error codes, enum labels); falls back to `fallback`. */
  td(key: string, fallback?: string, vars?: Record<string, string | number>): string;
}

const I18nContext = createContext<I18nValue | null>(null);

// Locale store: localStorage backed, SSR renders the default (az)
const localeListeners = new Set<() => void>();
let currentLocale: Locale | null = null;

function readLocale(): Locale {
  if (currentLocale) return currentLocale;
  let l: Locale = 'az';
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && saved in LOCALES) l = saved;
    else if (navigator.language.startsWith('tr')) l = 'tr';
    else if (navigator.language.startsWith('en')) l = 'en';
  } catch {
    /* storage blocked */
  }
  currentLocale = l;
  return l;
}

function subscribeLocale(cb: () => void) {
  localeListeners.add(cb);
  return () => localeListeners.delete(cb);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribeLocale, readLocale, () => 'az' as Locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    currentLocale = l;
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
    localeListeners.forEach((cb) => cb());
  }, []);

  const value = useMemo<I18nValue>(() => {
    const messages = LOCALES[locale];
    return {
      locale,
      setLocale,
      t: (key, vars) => format(lookup(messages, key), vars),
      td: (key, fallback, vars) => {
        const v = lookup(messages, key);
        return format(v === key ? (fallback ?? key) : v, vars);
      },
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n outside I18nProvider');
  return ctx;
}

/** Human message for an API / socket error code. */
export function useErrorText() {
  const { td, t } = useI18n();
  // stable identity per locale: safe to use in effect dependency lists
  return useCallback(
    (code: string | undefined, fallback?: string) => td(`errors.${code ?? 'generic'}`, fallback ?? t('errors.generic')),
    [td, t],
  );
}
