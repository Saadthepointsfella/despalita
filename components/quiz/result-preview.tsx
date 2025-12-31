import { Panel } from '@/components/ui/panel';
import { Divider } from '@/components/ui/divider';
import { LevelBadge } from '@/components/ui/level-badge';
import { ArrowLink } from '@/components/ui/arrow-link';

export function ResultPreview({
  level,
  heroTitle,
  heroCopy,
  topGapLabel,
  onUnlock,
}: {
  level: 1 | 2 | 3 | 4 | 5;
  heroTitle: string;
  heroCopy: string;
  topGapLabel: string;
  onUnlock: () => void;
}) {
  return (
    <Panel className="rounded-none border border-border bg-panel p-8">
      {/* Header strip */}
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-2">
          <div className="label-mono text-[11px] text-muted">Results Preview</div>
          <div className="font-serif text-2xl leading-tight text-fg">{heroTitle}</div>
          <div className="h-px w-16 bg-borderStrong" />
        </div>

        <LevelBadge level={level} />
      </div>

      <Divider className="my-6 border-border" />

      <p className="font-serif text-[15px] leading-relaxed text-fg/90">{heroCopy}</p>

      {/* Top gap teaser — rule-left callout */}
      <div className="mt-6 border border-border bg-bg">
        <div className="flex">
          <div className="w-1 bg-accent" aria-hidden="true" />
          <div className="p-5">
            <div className="label-mono text-[11px] text-muted">Top gap</div>
            <div className="mt-2 font-serif text-[15px] leading-relaxed text-fg">
              {topGapLabel} <span className="text-accent">→</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-col-reverse items-start justify-between gap-3 sm:flex-row sm:items-center">
        <ArrowLink href="/assessment" direction="up_right" className="label-mono text-[11px] text-muted hover:text-fg">
          Back to overview
        </ArrowLink>

        <button
          type="button"
          onClick={onUnlock}
          className="label-mono inline-flex items-center gap-2 border border-fg bg-fg px-5 py-3 text-[11px] text-bg transition-colors hover:bg-fg/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          Unlock full report <span aria-hidden="true">→</span>
        </button>
      </div>
    </Panel>
  );
}
