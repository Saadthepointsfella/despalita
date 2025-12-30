import { SectionLabel } from '@/components/ui/section-label';

export function QuizHeader({
  section,
  dimensionLabel,
  progressLabel,
}: {
  section: string;
  dimensionLabel: string;
  progressLabel: string;
}) {
  return (
    <header className="flex items-center justify-between py-6">
      <div className="font-mono text-sm font-semibold tracking-tight">MAXMIN</div>
      <div className="hidden md:block">
        <SectionLabel section={section} title={dimensionLabel} />
      </div>
      <div className="font-mono text-xs text-muted">{progressLabel}</div>
    </header>
  );
}
