import type {Metadata} from 'next';

import {BriefingView} from '@/components/BriefingView';

export const metadata: Metadata = {title: 'Briefings'};

export default function BriefingsPage() {
  return <BriefingView />;
}
