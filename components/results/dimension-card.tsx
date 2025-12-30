import * as React from 'react';
import type { ResultsDTO } from '@/lib/results/types';
import { Panel } from '@/components/ui/panel';
import { Divider } from '@/components/ui/divider';

function tierLabel(tier: 'low' | 'medium' | 'high') {
  if (tier === 'low') return 'Low foundation';
  if (tier === 'medium') return 'Developing system';
  return 'High leverage';
}

export function DimensionCard({
  d,
}: {
  d: ResultsDTO['dimensions'][number];
}) {
  const score = d.score.toFixed(2);

  const flags: string[] = [];
  if (d.is_primary_gap) flags.push('Primary gap');
  if (d.is_critical_gap) flags.push('Critical');

  return (
    <details className="group">
      <summary className="list-none cursor-pointer">
        <Panel className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-muted">
              {d.section} - {d.short_label}
            </div>
            <div className="font-medium text-fg truncate">{d.name}</div>
            <div className="text-xs text-muted">
              {tierLabel(d.tier)}
              {flags.length ? ` | ${flags.join(' | ')}` : ''}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-control border border-border bg-surface px-3 py-2 text-center">
              <div className="text-[11px] text-muted">Score</div>
              <div className="text-sm font-semibold">{score}</div>
            </div>
            <div
              className="h-8 w-8 rounded-control border border-border bg-surface flex items-center justify-center text-xs text-muted transition-transform group-open:rotate-45"
              aria-hidden
            >
              +
            </div>
          </div>
        </Panel>
      </summary>

      <div className="mt-3">
        <Panel className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <div className="text-xs text-muted">Tier</div>
              <div className="text-sm font-medium">{d.tier.toUpperCase()}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Delta from avg</div>
              <div className="text-sm font-medium">
                {d.delta_from_avg >= 0 ? '+' : ''}
                {d.delta_from_avg.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted">Flags</div>
              <div className="text-sm font-medium">{flags.length ? flags.join(', ') : '-'}</div>
            </div>
          </div>

          <Divider />

          <p className="text-sm text-muted">
            This section is intentionally terse: the roadmap below is the action layer.
          </p>
        </Panel>
      </div>
    </details>
  );
}
