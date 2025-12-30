import * as React from 'react';
import { isValidResultsToken } from '@/lib/results/token';
import { fetchResultsDto } from '@/lib/results/fetchResults';

import { Panel } from '@/components/ui/panel';
import { Divider } from '@/components/ui/divider';
import { SectionLabel } from '@/components/ui/section-label';
import { ArrowLink } from '@/components/ui/arrow-link';

import { ResultsHero } from '@/components/results/results-hero';
import { RadarCard } from '@/components/results/radar-card';
import { DimensionsSection } from '@/components/results/dimensions-section';
import { RoadmapSection } from '@/components/results/roadmap-section';
import { ResultsCTA } from '@/components/results/results-cta';

export default async function ResultsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!isValidResultsToken(token)) {
    return (
      <main className="container-narrow py-12 space-y-6">
        <Panel className="space-y-3">
          <SectionLabel section="00" label="Invalid token" />
          <Divider />
          <p className="text-sm text-muted">
            This link looks malformed. Please re-check the URL or re-run the assessment.
          </p>
          <div className="pt-2">
            <ArrowLink href="/assessment">Go to assessment</ArrowLink>
          </div>
        </Panel>
      </main>
    );
  }

  const resp = await fetchResultsDto(token);

  if (!resp.ok) {
    const is404 = resp.status === 404 || resp.error.code === 'NOT_FOUND';
    return (
      <main className="container-narrow py-12 space-y-6">
        <Panel className="space-y-3">
          <SectionLabel section="00" label={is404 ? 'Results not found' : 'Unable to load'} />
          <Divider />
          <p className="text-sm text-muted">
            {is404 ? 'Results not found.' : resp.error.message}
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <ArrowLink href="/assessment/quiz">Run the assessment</ArrowLink>
            <ArrowLink href="/assessment">What is this?</ArrowLink>
          </div>
        </Panel>
      </main>
    );
  }

  const dto = resp.data;

  return (
    <main className="container-max py-12 space-y-10">
      <ResultsHero dto={dto} />

      <section className="grid gap-6 md:grid-cols-2">
        <RadarCard dto={dto} />
        <Panel className="space-y-4">
          <SectionLabel section="02" label="Highlights" />
          <Divider />
          <ul className="space-y-2 text-sm">
            <li className="flex items-start justify-between gap-4">
              <span className="text-muted">Primary gap</span>
              <span className="font-medium text-fg">
                {dto.dimensions.find((d) => d.is_primary_gap)?.short_label ?? dto.primary_gap.dimension_id}
              </span>
            </li>
            <li className="flex items-start justify-between gap-4">
              <span className="text-muted">Critical gaps</span>
              <span className="font-medium text-fg">{dto.critical_gaps.length}</span>
            </li>
            <li className="flex items-start justify-between gap-4">
              <span className="text-muted">CTA intensity</span>
              <span className="font-medium text-fg">{dto.cta.intensity.toUpperCase()}</span>
            </li>
          </ul>

          <Divider />

          <div className="flex flex-wrap gap-3">
            <ArrowLink href={`/api/pdf/${dto.token}`}>Download PDF</ArrowLink>
            <ArrowLink href={`/api/og/${dto.token}`}>Share card</ArrowLink>
          </div>

          <p className="text-xs text-muted">
            PDF / share card are Phase 6 if your endpoints are still stubs.
          </p>
        </Panel>
      </section>

      <DimensionsSection dto={dto} />
      <RoadmapSection dto={dto} />
      <ResultsCTA dto={dto} />
    </main>
  );
}
