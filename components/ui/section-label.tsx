import { cn } from '@/lib/cn';

export function SectionLabel({
  section,
  className,
}: {
  section: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'font-mono text-[11px] uppercase tracking-micro text-faint',
        className,
      )}
    >
      {section}
    </span>
  );
}
