import { cn } from '@/lib/cn';

export function SectionLabel({
  section,
  label,
  title,
  className,
}: {
  section: string;
  label?: string;
  title?: string;
  className?: string;
}) {
  const text = label ?? title;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-micro text-faint',
        className,
      )}
    >
      <span>{section}</span>
      {text ? (
        <span className="text-[11px] uppercase tracking-[0.28em] text-muted">
          {text}
        </span>
      ) : null}
    </span>
  );
}
