// src/app/assessment/quiz/page.tsx
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";

export default function QuizPageSkeleton() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <SectionLabel
        number={2}
        title="Quiz (skeleton)"
        subtitle="Quiz content will be loaded from DB/config — not hardcoded."
      />

      <div className="mt-10 rounded-xl border border-border bg-panel p-6">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Question 01 / 24</span>
          <span>Section: Tracking</span>
        </div>

        <div className="mt-4 text-lg font-semibold tracking-headline">
          Question text loads here.
        </div>

        <div className="mt-6 grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Button key={i} variant="secondary" className="justify-start">
              Option {i + 1} (loaded from DB)
            </Button>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <Button variant="ghost">Next →</Button>
        </div>
      </div>
    </main>
  );
}
