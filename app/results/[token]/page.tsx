import { isValidResultsToken } from '@/lib/results/token';
import { getResultsDto } from '@/lib/assessment/getResultsDto';

import { Panel } from '@/components/ui/panel';
import { Divider } from '@/components/ui/divider';
import { SectionLabel } from '@/components/ui/section-label';
import { ArrowLink } from '@/components/ui/arrow-link';

import { ResultsHero } from '@/components/results/results-hero';
import { RadarCard } from '@/components/results/radar-card';
import { DimensionsSection } from '@/components/results/dimensions-section';
import { ResultsCTA } from '@/components/results/results-cta';

function SwissButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={[
        'inline-flex items-center justify-between gap-3',
        'rounded-sm border border-black/15',
        'bg-[#121212] px-4 py-3',
        'text-[12px] font-medium uppercase tracking-[0.18em]',
        'text-[#FAF9F6]',
        'min-w-[220px]',
      ].join(' ')}
    >
      <span>{children}</span>
      <span className="text-[#FAF9F6]/70">↗</span>
    </a>
  );
}

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // invalid token
  if (!isValidResultsToken(token)) {
    return (
      <main className="min-h-[100svh] bg-[#FAF9F6] text-[#1A1A1A]">
        <div className="container-narrow py-12">
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
        </div>
      </main>
    );
  }

  let dto = null;
  let loadError: string | null = null;

  try {
    dto = await getResultsDto(token);
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Unable to load results.';
  }

  if (!dto) {
    const is404 = !loadError;
    return (
      <main className="min-h-[100svh] bg-[#FAF9F6] text-[#1A1A1A]">
        <div className="container-narrow py-12">
          <Panel className="space-y-3">
            <SectionLabel section="00" label={is404 ? 'Results not found' : 'Unable to load'} />
            <Divider />
            <p className="text-sm text-muted">
              {is404 ? 'Results not found.' : loadError ?? 'Unable to load results.'}
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <ArrowLink href="/assessment/quiz">Run the assessment</ArrowLink>
              <ArrowLink href="/assessment">What is this?</ArrowLink>
            </div>
          </Panel>
        </div>
      </main>
    );
  }

  const primaryGap =
    dto.dimensions.find((d) => d.is_primary_gap)?.short_label ?? dto.primary_gap.dimension_id;

  return (
    <main className="min-h-[100svh] bg-[#FAF9F6] text-[#1A1A1A]">
      <div className="container-max py-8 md:py-12">
        {/* Outer swiss grid separator */}
        <div className="grid gap-px bg-black/10">
          {/* 01 — RESULTS (hero) */}
          <Panel className="space-y-6">
            <div className="flex items-end justify-between gap-6">
              <SectionLabel section="01" label="Results" />
            </div>
            <Divider />
            <ResultsHero dto={dto} />
          </Panel>

          {/* 02 — SNAPSHOT (radar + highlights) */}
          <Panel className="space-y-6">
            <div className="flex items-end justify-between gap-6">
              <SectionLabel section="02" label="Snapshot" />
              <div className="h-10 w-10 rounded-sm bg-[#121212] border border-black/10 flex items-center justify-center text-white/80 text-xl leading-none">
                +
              </div>
            </div>
            <Divider />

            <section className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <RadarCard dto={dto} />
              </div>

              <div className="lg:col-span-5">
                {/* “Swiss” highlight slab */}
                <Panel className="space-y-5">
                  <div className="flex items-end justify-between gap-6">
                    <SectionLabel section="02A" label="Highlights" />
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
                      Summary
                    </div>
                  </div>

                  <Divider />

                  <ul className="space-y-4 text-sm">
                    <li className="flex items-start justify-between gap-6">
                      <span className="text-muted">Primary gap</span>
                      <span className="font-medium text-fg text-right">{primaryGap}</span>
                    </li>
                    <li className="flex items-start justify-between gap-6">
                      <span className="text-muted">Critical gaps</span>
                      <span className="font-medium text-fg">{dto.critical_gaps.length}</span>
                    </li>
                    <li className="flex items-start justify-between gap-6">
                      <span className="text-muted">CTA intensity</span>
                      <span className="font-medium text-fg">{dto.cta.intensity.toUpperCase()}</span>
                    </li>
                  </ul>

                  <Divider />

                  {/* Buttons repeated here (nice for desktop too) */}
                  <div className="flex flex-col gap-3">
                    <SwissButton href={`/api/pdf/${dto.token}`}>Download PDF</SwissButton>
                    <SwissButton href={`/api/og/${dto.token}`}>Share card</SwissButton>
                  </div>
                </Panel>
              </div>
            </section>
          </Panel>

          {/* 03 — DIMENSIONS */}
          <Panel className="space-y-6">
            <div className="flex items-end justify-between gap-6">
              <SectionLabel section="03" label="Dimensions" />
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
                Expand each dimension for detail
              </div>
            </div>
            <Divider />
            <DimensionsSection dto={dto} />
          </Panel>

          {/* 04 — NEXT STEP */}
          <Panel className="space-y-6">
            <div className="flex items-end justify-between gap-6">
              <SectionLabel section="04" label="Next step" />
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
                Action layer
              </div>
            </div>
            <Divider />
            <ResultsCTA dto={dto} />
          </Panel>
        </div>
      </div>
    </main>
  );
}
