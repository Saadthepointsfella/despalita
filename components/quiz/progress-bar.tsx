import { cn } from '@/lib/cn';

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(1, value));
  const left = `${pct * 100}%`;

  return (
    <div className={cn('relative', className)}>
      {/* base rule */}
      <div className="h-px w-full bg-borderStrong" />

      {/* fill rule (subtle) */}
      <div className="absolute left-0 top-0 h-px bg-fg" style={{ width: left }} />

      {/* signal dot */}
      <div
        className="absolute top-0 h-2 w-2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-accent"
        style={{ left }}
        aria-hidden="true"
      />
    </div>
  );
}
