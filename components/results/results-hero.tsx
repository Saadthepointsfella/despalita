import * as React from 'react';
import type { ResultsDTO } from '@/lib/results/types';
import { Panel } from '@/components/ui/panel';
import { Divider } from '@/components/ui/divider';
import { SectionLabel } from '@/components/ui/section-label';
import { LevelBadge } from '@/components/ui/level-badge';

function tokenToCssColor(colorToken: string): string {
  // Expect: "level.1".."level.5" or "accent"
  if (colorToken.startsWith('level.')) {
    const n = colorToken.split('.')[1];
    return `hsl(var(--level-${n}))`;
  }
  if (colorToken === 'accent') return 'hsl(var(--accent))';
  return 'hsl(var(--fg))';
}

export function ResultsHero({ dto }: { dto: ResultsDTO }) {
  const levelColor = tokenToCssColor(dto.overall.level.color_token);

  const created = new Date(dto.created_at);
  const createdLabel = isNaN(created.getTime())
    ? dto.created_at
    : created.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });

  return (
    <Panel className="space-y-4">
      <div className="flex items-start justify-between gap-6">
        <SectionLabel section="01" label="Your maturity snapshot" />
        <div className="text-xs text-muted">Generated {createdLabel}</div>
      </div>

      <Divider />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <LevelBadge level={dto.overall.level.level} />
            <span className="text-sm font-medium" style={{ color: levelColor }}>
              {dto.overall.level.name}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-semibold tracking-tightHeading">
            {dto.overall.level.hero_title}
          </h1>
          <p className="text-sm text-muted max-w-prose">{dto.overall.level.hero_copy}</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="rounded-card border border-border bg-surface px-4 py-3 text-center">
            <div className="text-xs text-muted">Score</div>
            <div className="text-xl font-semibold">
              {dto.overall.score_capped.toFixed(2)}
            </div>
            {dto.overall.score_capped !== dto.overall.score ? (
              <div className="text-[11px] text-muted">capped (weakest-link)</div>
            ) : (
              <div className="text-[11px] text-muted">raw = {dto.overall.score.toFixed(2)}</div>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}
