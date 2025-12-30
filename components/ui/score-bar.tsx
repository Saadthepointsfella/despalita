import { cn } from '@/lib/cn';

export function ScoreBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, ((value - 1) / 4) * 100));
  return (
    <div className={cn('h-2 w-full rounded-control border border-border bg-border/60', className)}>
      <div className="h-full rounded-control bg-fg" style={{ width: `${pct}%` }} />
    </div>
  );
}
