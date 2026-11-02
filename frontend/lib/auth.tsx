'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError } from './api';
import type { Me } from './types';

interface AuthValue {
  me: Me | null;
  loading: boolean;
  refresh(): Promise<Me | null>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const m = await api<Me>('/auth/me');
      setMe(m);
      return m;
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 401) console.warn(e);
      setMe(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setMe(null);
  }, []);

  useEffect(() => {
    let alive = true;
    api<Me>('/auth/me')
      .then((m) => alive && setMe(m))
      .catch(() => alive && setMe(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return <AuthContext.Provider value={{ me, loading, refresh, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}

/** Backend route that starts EduPortal single sign-on (docs/EDUPORTAL_SSO.md). */
export function ssoStartUrl(next: string) {
  return `/api/auth/sso/start?next=${encodeURIComponent(next)}`;
}

/** Redirects to /login when signed out. */
export function useRequireAuth() {
  const auth = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!auth.loading && !auth.me) {
      router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [auth.loading, auth.me, router]);
  return auth;
}
