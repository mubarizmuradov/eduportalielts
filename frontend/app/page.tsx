'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';

/** Signed in → dashboard, otherwise EduPortal sign-in. */
export default function Home() {
  const { me, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading) router.replace(me ? '/dashboard' : '/login');
  }, [loading, me, router]);
  return (
    <main className="grid min-h-dvh place-items-center">
      <Spinner />
    </main>
  );
}
