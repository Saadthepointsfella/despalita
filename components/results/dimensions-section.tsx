import * as React from 'react';
import type { ResultsDTO } from '@/lib/results/types';
import { Panel } from '@/components/ui/panel';
import { Divider } from '@/components/ui/divider';
import { SectionLabel } from '@/components/ui/section-label';
import { DimensionCard } from './dimension-card';

export function DimensionsSection({ dto }: { dto: ResultsDTO }) {
  const dims = dto.dimensions.slice().sort((a, b) => a.order - b.order);

  return (
    <section className="space-y-4">
      <Panel className="space-y-4">
        <SectionLabel section="03" label="Dimensions" />
        <Divider />
        <p className="text-sm text-muted">
          Expand each dimension for tier, deltas, and what this means operationally.
        </p>
      </Panel>

      <div className="space-y-3">
        {dims.map((d) => (
          <DimensionCard key={d.dimension_id} d={d} />
        ))}
      </div>
    </section>
  );
}
