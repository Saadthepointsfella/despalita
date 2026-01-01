import { ArrowLink } from '@/components/ui/arrow-link';
import { Divider } from '@/components/ui/divider';
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
    <header className="space-y-3">
      <div className="flex items-end justify-between gap-6">
        <div className="flex items-baseline gap-3">
          <SectionLabel section={section} />
          <div className="text-sm font-medium text-fg">{dimensionLabel}</div>
        </div>

        <div className="flex items-center gap-4">
          <div className="font-mono text-[11px] uppercase tracking-micro text-faint">
            {progressLabel}
          </div>
          <ArrowLink href="/assessment" className="text-faint">
            Exit
          </ArrowLink>
        </div>
      </div>

      <Divider />
    </header>
  );
}
