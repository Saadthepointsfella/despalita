import * as React from 'react';
import type { ResultsDTO } from '@/lib/results/types';
import { Panel } from '@/components/ui/panel';
import { Divider } from '@/components/ui/divider';
import { SectionLabel } from '@/components/ui/section-label';
import { RoadmapModuleCard } from './roadmap-module-card';

export function RoadmapSection({ dto }: { dto: ResultsDTO }) {
  const modules = dto.roadmap ?? [];

  return (
    <section className="space-y-4">
      <Panel className="space-y-4">
        <SectionLabel section="04" label="Priority roadmap" />
        <Divider />
        <p className="text-sm text-muted">
          Top gaps only. Each module includes Now / Next / Later and a success indicator.
        </p>
      </Panel>

      {modules.length === 0 ? (
        <Panel>
          <p className="text-sm text-muted">No roadmap modules available.</p>
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {modules.map((m) => (
            <RoadmapModuleCard key={`${m.dimension_id}:${m.tier}`} module={m} />
          ))}
        </div>
      )}
    </section>
  );
}
