import * as React from 'react';
import { cn } from '@/lib/cn';

export const OptionCard = React.forwardRef<
  HTMLButtonElement,
  {
    id: string;
    label: string;
    checked: boolean;
    indexLabel: string;
    onSelect: () => void;
    tabIndex: number;
    onFocus?: () => void;
  }
>(function OptionCard({ id, label, checked, indexLabel, onSelect, tabIndex, onFocus }, ref) {
  const normalizedLabel = label
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\s-\s/g, ', ');

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
        'group relative w-full overflow-hidden rounded-none border border-border bg-bg px-4 py-3 text-left sm:px-5 sm:py-4',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
        checked && 'border-borderStrong',
      )}
    >
      {/* hover invert overlay */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 translate-y-full bg-fg transition-transform duration-500',
          'group-hover:translate-y-0 group-focus-visible:translate-y-0',
          checked && 'translate-y-0',
        )}
        aria-hidden="true"
      />

      <div className="relative flex items-start gap-4">
        {/* Mono index + signal dot */}
        <div className="mt-[2px] flex shrink-0 items-center gap-3">
          <span
            className={cn(
              'label-mono text-[11px] text-muted transition-colors',
              (checked ? 'text-bg' : 'group-hover:text-bg'),
            )}
          >
            {indexLabel}
          </span>

          <span
            className={cn(
              'h-2 w-2 rounded-full border border-border transition-colors',
              checked ? 'border-accent bg-accent' : 'bg-transparent group-hover:border-bg',
            )}
            aria-hidden="true"
          />
        </div>

        <span
          className={cn(
            'font-serif text-[14px] leading-relaxed text-fg transition-colors sm:text-[15px]',
            (checked ? 'text-bg' : 'group-hover:text-bg'),
          )}
        >
          {normalizedLabel}
        </span>
      </div>

      {/* tiny underline signal on selected */}
      {checked ? <div className="relative mt-3 h-px w-full bg-accent" aria-hidden="true" /> : null}
    </button>
  );
});
