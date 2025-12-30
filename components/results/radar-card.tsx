import * as React from 'react';
import dynamic from 'next/dynamic';
import type { ResultsDTO } from '@/lib/results/types';
import { Panel } from '@/components/ui/panel';
import { Divider } from '@/components/ui/divider';
import { SectionLabel } from '@/components/ui/section-label';

const RadarChartClient = dynamic(() => import('./radar-chart-client'), { ssr: false });

export function RadarCard({ dto }: { dto: ResultsDTO }) {
  return (
    <Panel className="space-y-4">
      <SectionLabel section="02" label="Radar" />
      <Divider />
      <div className="h-72 md:h-80">
        <RadarChartClient dto={dto} />
      </div>
      <p className="text-xs text-muted">
        Scores are per-dimension averages (1-5). The shape is your operating profile.
      </p>
    </Panel>
  );
}
