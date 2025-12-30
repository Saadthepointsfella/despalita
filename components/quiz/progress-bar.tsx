import { cn } from '@/lib/cn';

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className={cn('h-2 w-full rounded-control border border-border bg-border/60', className)}>
      <div
        className="h-full rounded-control bg-fg transition-[width] duration-300 ease-out"
        style={{ width: `${pct * 100}%` }}
      />
    </div>
  );
}
