import * as React from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'ghost';

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function Button({ className, variant = 'primary', ...props }, ref) {
  const base =
    'inline-flex items-center justify-center rounded-control px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50 disabled:pointer-events-none';

  const styles =
    variant === 'primary'
      ? 'bg-fg text-bg hover:bg-fg/90'
      : 'border border-border bg-transparent text-fg hover:bg-border/40';

  return <button ref={ref} className={cn(base, styles, className)} {...props} />;
});
