import Link from 'next/link';
import { cn } from '@/lib/cn';

export function ArrowLink({
  href,
  children,
  direction = 'right',
  className,
}: {
  href: string;
  children: React.ReactNode;
  direction?: 'right' | 'up_right';
  className?: string;
}) {
  const arrow = direction === 'up_right' ? '↗' : '→';
  return (
    <Link href={href} className={cn('text-sm text-fg hover:text-accent transition-colors', className)}>
      {children} <span aria-hidden="true">{arrow}</span>
    </Link>
  );
}
