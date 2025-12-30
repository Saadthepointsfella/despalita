import * as React from 'react';
import { cn } from '@/lib/cn';

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-card border border-border bg-surface p-6',
        className
      )}
      {...props}
    />
  );
}
