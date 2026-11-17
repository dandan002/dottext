'use client';

import {usePathname, useRouter} from 'next/navigation';
import {useEffect, type ReactNode} from 'react';
import {Center} from '@astryxdesign/core/Center';
import {Spinner} from '@astryxdesign/core/Spinner';

import {useSession} from '../lib/session';

/**
 * Client-side redirect for the preview session only. When real auth lands,
 * the server resolves the user and workspace before rendering anything.
 */
export function RequireSession({children}: {children: ReactNode}) {
  const {session} = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (session.status === 'signed-out') {
      router.replace(`/login?next=${encodeURIComponent(pathname ?? '/')}`);
    }
  }, [session.status, router, pathname]);

  if (session.status !== 'signed-in') {
    return (
      <Center axis="both" minHeight="100dvh">
        <Spinner size="lg" />
      </Center>
    );
  }
  return children;
}
