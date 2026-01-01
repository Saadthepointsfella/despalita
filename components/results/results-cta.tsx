import * as React from 'react';
import type { ResultsDTO } from '@/lib/results/types';
import { Panel } from '@/components/ui/panel';
import { Divider } from '@/components/ui/divider';
import { SectionLabel } from '@/components/ui/section-label';

function intensityCopy(intensity: 'hot' | 'warm' | 'cool') {
  if (intensity === 'hot') {
    return {
      title: 'You have compounding upside, but foundations are leaking.',
      copy: 'Fixing the top gaps will remove drag and make every marketing dollar more legible.',
    };
  }
  if (intensity === 'warm') {
    return {
      title: "You're close, a few systems will unlock the next tier.",
      copy: 'Tighten instrumentation + decision cadence so improvements compound instead of resetting.',
    };
  }
  return {
    title: "You're operating clean. Now optimize for leverage.",
    copy: 'At this stage, the wins come from better experiments, sharper forecasting, and faster decision loops.',
  };
}

export function ResultsCTA({ dto }: { dto: ResultsDTO }) {
  const { title, copy } = intensityCopy(dto.cta.intensity);
  const reasonCodes = dto.cta.reason_codes.map((code) => code.replace(/\s*\(.*?\)\s*/g, '').trim());

  return (
    <section className="space-y-4">
      <Panel className="space-y-4">
        <SectionLabel section="05" label="Next step" />
        <Divider />
        <div className="space-y-2">
          <div className="text-lg font-semibold tracking-tightHeading">{title}</div>
          <p className="text-sm text-muted max-w-prose">{copy}</p>
        </div>

        <Divider />

        <div className="flex flex-wrap gap-3">
          <a
            href="/assessment"
            className={[
              'inline-flex items-center justify-between gap-3',
              'rounded-sm border border-black/15',
              'bg-[#121212] px-4 py-3',
              'text-[12px] font-medium uppercase tracking-[0.18em]',
              'text-[#FAF9F6]',
              'min-w-[220px]',
            ].join(' ')}
          >
            <span>Run again</span>
            <span className="text-[#FAF9F6]/70">↗</span>
          </a>
          <a
            href="https://www.maxmin.agency/dtc-maturity-model.html"
            className={[
              'inline-flex items-center justify-between gap-3',
              'rounded-sm border border-black/15',
              'bg-[#121212] px-4 py-3',
              'text-[12px] font-medium uppercase tracking-[0.18em]',
              'text-[#FAF9F6]',
              'min-w-[220px]',
            ].join(' ')}
            target="_blank"
            rel="noreferrer"
          >
            <span>Read more</span>
            <span className="text-[#FAF9F6]/70">↗</span>
          </a>
        </div>

        <div className="text-xs text-muted">
          Reason codes: {reasonCodes.join(', ') || '-'}
        </div>
      </Panel>
    </section>
  );
}
