'use client';

import NextLink from 'next/link';
import type {ReactNode} from 'react';
import {LinkProvider} from '@astryxdesign/core/Link';
import {Theme} from '@astryxdesign/core/theme';

import {themes, defaultThemeSlug} from '../astryx-themes';
import {SessionProvider} from '@/lib/session';

export function Providers({children}: {children: ReactNode}) {
  return (
    <Theme theme={themes[defaultThemeSlug]}>
      <LinkProvider component={NextLink}>
        <SessionProvider>{children}</SessionProvider>
      </LinkProvider>
    </Theme>
  );
}
