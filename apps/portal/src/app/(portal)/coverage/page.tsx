import type {Metadata} from 'next';

import {CoverageView} from '@/components/CoverageView';

export const metadata: Metadata = {title: 'Coverage'};

export default function CoveragePage() {
  return <CoverageView />;
}
