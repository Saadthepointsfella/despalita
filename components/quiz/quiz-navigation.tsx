export function QuizNavigation({
  canGoBack,
  canGoNext,
  isLast,
  onBack,
  onNext,
  submitting,
}: {
  canGoBack: boolean;
  canGoNext: boolean;
  isLast: boolean;
  onBack: () => void;
  onNext: () => void;
  submitting?: boolean;
}) {
  return (
    <div className="mt-10 flex items-center justify-between gap-4">
      <button
        type="button"
        onClick={onBack}
        disabled={!canGoBack || submitting}
        className="label-mono inline-flex items-center gap-2 border border-border bg-transparent px-5 py-3 text-[11px] text-fg transition-colors hover:bg-fg hover:text-bg disabled:cursor-not-allowed disabled:opacity-50"
      >
        ← Back
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext || submitting}
        className="label-mono inline-flex items-center gap-2 border border-fg bg-fg px-6 py-3 text-[11px] text-bg transition-colors hover:bg-fg/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLast ? 'Submit →' : 'Next →'}
      </button>
    </div>
  );
}
