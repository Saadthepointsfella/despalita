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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
          <SectionLabel section={section} />
          <div className="text-sm font-medium text-fg">{dimensionLabel}</div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="font-mono text-[10px] uppercase tracking-micro text-faint sm:text-[11px]">
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
