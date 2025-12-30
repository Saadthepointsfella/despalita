import * as React from 'react';
import type { ResultsDTO } from '@/lib/results/types';
import { Panel } from '@/components/ui/panel';
import { Divider } from '@/components/ui/divider';

export function RoadmapModuleCard({
  module,
}: {
  module: ResultsDTO['roadmap'][number];
}) {
  return (
    <Panel className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs text-muted">
            {module.dimension_id} | {module.tier.toUpperCase()}
          </div>
          <div className="font-medium text-fg">What it means</div>
        </div>
      </div>

      <p className="text-sm text-muted whitespace-pre-line">{module.what_it_means}</p>

      <Divider />

      <div className="space-y-3 text-sm">
        <Block title="Now" items={module.now} />
        <Block title="Next" items={module.next} />
        <Block title="Later" items={module.later} />
      </div>

      <Divider />

      <div className="text-xs text-muted">
        <span className="text-fg font-medium">Success:</span> {module.success_indicator}
      </div>
    </Panel>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted">{title}</div>
      <ul className="list-disc pl-5 space-y-1">
        {(items ?? []).map((x, i) => (
          <li key={`${title}-${i}`} className="text-sm">
            {x}
          </li>
        ))}
      </ul>
    </div>
  );
}
