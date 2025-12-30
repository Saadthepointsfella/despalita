import { Button } from '@/components/ui/button';

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
    <div className="mt-6 flex items-center justify-between gap-3">
      <Button variant="ghost" onClick={onBack} disabled={!canGoBack || submitting}>
        Back
      </Button>
      <Button onClick={onNext} disabled={!canGoNext || submitting}>
        {isLast ? 'Submit →' : 'Next →'}
      </Button>
    </div>
  );
}
