import * as React from 'react';
import type { ResultsDTO } from '@/lib/results/types';
import { Panel } from '@/components/ui/panel';
import { Divider } from '@/components/ui/divider';

type Tier = 'low' | 'medium' | 'high';

function prettyTier(tier: Tier) {
  if (tier === 'low') return 'Low foundation';
  if (tier === 'medium') return 'Developing system';
  return 'High leverage';
}

const DIMENSION_TIER_BLURBS: Record<string, Record<Tier, string>> = {
  tracking: {
    low: 'Your data capture is inconsistent, so downstream reporting and attribution will drift. Priority, standardize events, naming, and source-of-truth fields.',
    medium: 'You capture most key events, but coverage and definitions still vary by channel and tool. Priority, tighten taxonomy and QA so numbers stay stable week to week.',
    high: 'Tracking is reliable and standardized, enabling clean measurement and automation. Priority, maintain QA and extend coverage to edge cases (offline, refunds, returns).',
  },
  attribution: {
    low: 'Measurement is mostly heuristic, so budget decisions are noisy. Priority, lock conversion definitions, clean spend ingestion, and start simple incrementality or holdouts.',
    medium: 'You have usable measurement, but it is not yet decision-grade across channels. Priority, unify attribution logic and validate with lift tests where it matters most.',
    high: 'Attribution is stable enough to guide allocation with confidence. Priority, keep calibration via experiments and use MMM or testing to resolve hard-to-measure channels.',
  },
  reporting: {
    low: 'Reporting is fragmented, so teams debate numbers instead of acting. Priority, define core KPIs, one source of truth, and a minimal weekly decision dashboard.',
    medium: 'Dashboards exist and get used, but gaps remain in consistency and drill-down. Priority, strengthen definitions, owner metrics, and alerting for anomalies.',
    high: 'Reporting is decision-first, clear KPIs, fast diagnosis, and trusted views. Priority, automate alerts, reduce manual work, and tighten exec and operator cadence.',
  },
  experimentation: {
    low: 'Changes ship without controlled measurement, so you cannot separate signal from noise. Priority, establish a simple test protocol (hypothesis, metric, holdout).',
    medium: 'You run tests, but rigor and velocity are inconsistent. Priority, standardize design, sizing, and readouts so experimentation compounds instead of restarting.',
    high: 'Experimentation reliably produces learnings you can operationalize. Priority, scale velocity and connect results directly to roadmap and budget decisions.',
  },
  lifecycle: {
    low: 'Retention and CRM are reactive, leaving LTV on the table. Priority, fix identity and segmentation basics, then build a small set of proven flows.',
    medium: 'Lifecycle programs exist, but targeting and measurement can be sharper. Priority, improve segments, suppression logic, and incrementality of campaigns.',
    high: 'Lifecycle is a growth engine, segmentation, automation, and measurement are strong. Priority, expand personalization and optimize offers and timing with testing.',
  },
  infrastructure: {
    low: 'Data foundations are brittle, making everything slower and less trustworthy. Priority, stabilize pipelines, define canonical tables, and reduce manual joins.',
    medium: 'You have a functioning stack, but reliability and lineage can still break decisions. Priority, add monitoring, model ownership, and clean transformations.',
    high: 'Infrastructure is robust and scalable, enabling fast analysis and dependable metrics. Priority, deepen observability, governance, and performance as volume grows.',
  },
};

function dimensionKeyFrom(d: { dimension_id?: string; short_label: string }) {
  const raw = (d.dimension_id ?? d.short_label ?? '').toLowerCase();

  if (raw.includes('track')) return 'tracking';
  if (raw.includes('attrib')) return 'attribution';
  if (raw.includes('report')) return 'reporting';
  if (raw.includes('experiment') || raw.includes('test')) return 'experimentation';
  if (raw.includes('life') || raw.includes('crm')) return 'lifecycle';
  if (raw.includes('infra') || raw.includes('data')) return 'infrastructure';

  return 'tracking';
}

function getDimensionBlurb(d: { dimension_id?: string; short_label: string }, tier: Tier) {
  const key = dimensionKeyFrom(d);
  return DIMENSION_TIER_BLURBS[key]?.[tier] ?? 'This dimension indicates how reliably this capability turns data into decisions.';
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
              {d.section}, {d.short_label}
            </div>
            <div className="font-medium text-fg truncate">{d.name}</div>
            <div className="text-xs text-muted">
              {prettyTier(d.tier)}
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
            <span className="text-fg">{prettyTier(d.tier)}</span> ({score}/5), {getDimensionBlurb(d, d.tier)}
          </p>
        </Panel>
      </div>
    </details>
  );
}
