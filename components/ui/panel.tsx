import * as React from 'react';
import { cn } from '@/lib/cn';

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-card border border-border bg-surface',
        'px-6 py-5 md:px-7 md:py-6',
        className,
      )}
      {...props}
    />
  );
}
