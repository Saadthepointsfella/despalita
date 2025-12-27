// src/components/ui/level-badge.tsx
import { cn } from "@/lib/cn";

const levelStyles: Record<number, string> = {
  1: "border-level-1/40 text-level-1 bg-level-1/10",
  2: "border-level-2/40 text-level-2 bg-level-2/10",
  3: "border-level-3/40 text-level-3 bg-level-3/10",
  4: "border-level-4/40 text-level-4 bg-level-4/10",
  5: "border-level-5/40 text-level-5 bg-level-5/10",
};

export function LevelBadge({
  level,
  label,
  className,
}: {
  level: 1 | 2 | 3 | 4 | 5;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        levelStyles[level],
        className
      )}
    >
      <span className="opacity-90">Level {level}</span>
      <span className="text-text/70">/</span>
      <span className="text-text">{label ?? "—"}</span>
    </span>
  );
}
