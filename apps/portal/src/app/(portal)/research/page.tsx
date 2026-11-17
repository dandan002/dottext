import type {Metadata} from 'next';

import {ResearchView} from '@/components/ResearchView';

export const metadata: Metadata = {title: 'Research'};

export default function ResearchPage() {
  return <ResearchView />;
}
