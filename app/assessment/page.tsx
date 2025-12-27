// src/app/assessment/page.tsx
import { ArrowLink } from "@/components/ui/arrow-link";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { ScoreBar } from "@/components/ui/score-bar";

export default function AssessmentLandingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <SectionLabel
        number={1}
        title="DTC Analytics Maturity"
        subtitle="Answer 24 capability questions. Get a personalized roadmap."
      />

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-panel p-6">
          <div className="text-sm text-muted">What you’ll get</div>
          <div className="mt-2 text-xl font-semibold tracking-headline">
            A radar chart + gap-driven roadmap
          </div>
          <div className="mt-4 text-sm text-muted">
            Preview first, then email gate to unlock the full report.
          </div>

          <div className="mt-6">
            <Button as-child={undefined} onClick={undefined} />
            <Button
              className="w-full"
              onClick={() => {
                // navigation is handled by Link in real flow
              }}
            >
              Start assessment →
            </Button>
          </div>

          <div className="mt-4 text-xs text-muted">
            (This page will become marketing-grade in Phase 2.)
          </div>
        </div>

        <div className="rounded-xl border border-border bg-panel p-6">
          <div className="text-sm text-muted">Example “shape”</div>
          <div className="mt-4">
            <ScoreBar value={3.2} tone="neutral" />
          </div>
          <div className="mt-6">
            <ArrowLink href="/assessment/quiz" muted>
              Continue to quiz UI
            </ArrowLink>
          </div>
        </div>
      </div>
    </main>
  );
}
