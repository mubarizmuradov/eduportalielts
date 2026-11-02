'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import { ErrorBanner, LangSwitch, Logo, Spinner } from '@/components/ui';
import { ssoStartUrl, useAuth } from '@/lib/auth';
import { useErrorText, useI18n } from '@/lib/i18n';

function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/dashboard';
}

/**
 * The only way to sign in is EduPortal (docs/EDUPORTAL_SSO.md). Without an
 * error the page goes there right away; after an error it waits for a click,
 * so a failing EduPortal never causes a redirect loop.
 */
function LoginScreen() {
  const { t } = useI18n();
  const errorText = useErrorText();
  const { me, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const error = params.get('error');
  // After an error or a sign-out the page waits for a click (no redirect loop,
  // no silent sign-in again through the still-open EduPortal session).
  const manual = !!error || params.has('signedOut');
  const autoRedirect = !manual && !loading && !me;

  useEffect(() => {
    if (me) router.replace(next);
  }, [me, next, router]);

  useEffect(() => {
    if (autoRedirect) window.location.replace(ssoStartUrl(next));
  }, [autoRedirect, next]);

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <LangSwitch />
        </div>
        <div className="card space-y-4 p-6 shadow-sm">
          <h1 className="text-2xl font-bold">{t('login.title')}</h1>
          <ErrorBanner message={error ? errorText(error) : null} />
          {manual ? (
            <>
              <a
                href={ssoStartUrl(next)}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#14284b] px-5 py-4 text-lg font-bold text-white transition hover:bg-[#1d3866] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#93c5fd]"
              >
                <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-white text-base font-black text-[#14284b]">
                  E
                </span>
                {t('login.withEduportal')}
              </a>
              <p className="text-muted text-sm">{t('login.ssoHint')}</p>
            </>
          ) : (
            <div className="flex items-center gap-3 py-4 text-sm font-semibold" role="status">
              <Spinner className="h-6 w-6" />
              {t('login.redirecting')}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginScreen />
    </Suspense>
  );
}
