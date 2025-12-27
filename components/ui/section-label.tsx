// src/components/ui/section-label.tsx
import { cn } from "@/lib/cn";

export function SectionLabel({
  number,
  title,
  subtitle,
  className,
}: {
  number: number;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  const n = String(number).padStart(2, "0");
  return (
    <div className={cn("flex items-start gap-4", className)}>
      <div className="select-none text-xs tracking-widest text-muted">
        {n}
      </div>
      <div>
        <div className="text-lg font-semibold tracking-headline">
          {title}
        </div>
        {subtitle ? (
          <div className="mt-1 text-sm text-muted">{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}
