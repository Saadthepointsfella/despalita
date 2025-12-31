import { cn } from '@/lib/cn';

export function LevelBadge({ level, className }: { level: 1 | 2 | 3 | 4 | 5; className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-control border border-border bg-bg px-3 py-1.5',
        className,
      )}
      style={{ borderColor: `hsl(var(--level-${level}))` }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: `hsl(var(--level-${level}))` }}
        aria-hidden="true"
      />
      <span className="font-mono text-[11px] uppercase tracking-micro text-fg">
        Level {level}
      </span>
    </div>
  );
}
