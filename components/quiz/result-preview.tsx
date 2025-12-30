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
    <Panel className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="font-mono text-xs text-muted">Preview</div>
          <div className="text-lg font-semibold tracking-tightHeading">{heroTitle}</div>
        </div>
        <LevelBadge level={level} />
      </div>

      <Divider />

      <p className="text-sm text-muted">{heroCopy}</p>

      <div className="rounded-control border border-border bg-bg/50 p-4 text-sm">
        <div className="font-mono text-xs text-muted">Top gap teaser</div>
        <div className="mt-1 text-fg">{topGapLabel}</div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onUnlock}
          className="text-sm text-fg hover:text-accent transition-colors"
        >
          Unlock the full roadmap →
        </button>
        <ArrowLink href="/assessment" direction="up_right" className="text-muted">
          Back to overview
        </ArrowLink>
      </div>
    </Panel>
  );
}
