import type {ReactNode} from 'react';

import {PortalShell} from '@/components/PortalShell';
import {RequireSession} from '@/components/RequireSession';

export default function PortalLayout({children}: {children: ReactNode}) {
  return (
    <RequireSession>
      <PortalShell>{children}</PortalShell>
    </RequireSession>
  );
}
