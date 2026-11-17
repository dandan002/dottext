import type {Metadata} from 'next';
import type {ReactNode} from 'react';

// Astryx base styles; without these, components render unstyled.
// Theme tokens and fonts are imported by src/astryx-themes.ts.
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import {Providers} from './providers';

export const metadata: Metadata = {
  title: {default: 'dottext', template: '%s · dottext'},
  description: 'Private emerging markets research portal',
  robots: {index: false, follow: false},
};

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
