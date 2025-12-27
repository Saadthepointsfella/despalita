// src/components/ui/score-bar.tsx
import { cn } from "@/lib/cn";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function ScoreBar({
  value,
  max = 5,
  tone = "neutral",
  level,
  className,
}: {
  value: number;
  max?: number;
  tone?: "neutral" | "level";
  level?: 1 | 2 | 3 | 4 | 5;
  className?: string;
}) {
  const pct = clamp(value / max, 0, 1);
  const fill =
    tone === "level" && level
      ? `bg-level-${level}`
      : "bg-text";

  return (
    <div className={cn("w-full", className)} aria-label={`Score ${value}/${max}`}>
      <div className="h-2 w-full rounded-full bg-border/50">
        <div
          className={cn("h-2 rounded-full transition-[width]", fill)}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>0</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
