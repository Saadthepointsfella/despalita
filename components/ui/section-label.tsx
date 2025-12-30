import { cn } from '@/lib/cn';

export function SectionLabel({
  section,
  title,
  label,
  className,
}: {
  section: string;
  title?: string;
  label?: string;
  className?: string;
}) {
  const displayText = title ?? label ?? '';
  return (
    <div className={cn('flex items-center justify-between gap-6', className)}>
      <div className="font-mono text-xs tracking-tight text-muted">{section}</div>
      <div className="font-mono text-xs tracking-tight text-muted">{displayText}</div>
    </div>
  );
}
