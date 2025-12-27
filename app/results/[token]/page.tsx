// src/app/results/[token]/page.tsx
import { LevelBadge } from "@/components/ui/level-badge";
import { ScoreBar } from "@/components/ui/score-bar";
import { SectionLabel } from "@/components/ui/section-label";

export default function ResultsPageSkeleton({
  params,
}: {
  params: { token: string };
}) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <SectionLabel
        number={3}
        title="Results (skeleton)"
        subtitle={`Token: ${params.token} (server will fetch + gate in Phase 4/5)`}
      />

      <div className="mt-10 rounded-xl border border-border bg-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <LevelBadge level={3} label="Systematic" />
          <div className="text-sm text-muted">Primary gap: Attribution</div>
        </div>

        <div className="mt-6">
          <ScoreBar value={3.1} tone="level" level={3} />
        </div>
      </div>
    </main>
  );
}
