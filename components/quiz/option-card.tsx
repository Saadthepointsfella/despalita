import * as React from 'react';
import { cn } from '@/lib/cn';

export const OptionCard = React.forwardRef<
  HTMLButtonElement,
  {
    id: string;
    label: string;
    checked: boolean;
    accentLevel: 1 | 2 | 3 | 4 | 5;
    onSelect: () => void;
    tabIndex: number;
    onFocus?: () => void;
  }
>(function OptionCard({ id, label, checked, accentLevel, onSelect, tabIndex, onFocus }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={checked}
      id={id}
      tabIndex={tabIndex}
      onClick={onSelect}
      onFocus={onFocus}
      className={cn(
        'w-full rounded-card border border-border bg-surface p-4 text-left text-sm',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        checked && 'border-fg/60',
      )}
      style={checked ? { borderColor: `hsl(var(--level-${accentLevel}))` } : undefined}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-1 inline-block h-3 w-3 rounded-full border border-border"
          style={
            checked
              ? {
                  background: `hsl(var(--level-${accentLevel}))`,
                  borderColor: `hsl(var(--level-${accentLevel}))`,
                }
              : undefined
          }
          aria-hidden="true"
        />
        <span className="text-fg">{label}</span>
      </div>
    </button>
  );
});
