import { getQuizPayload } from '@/lib/db/get-quiz';
import { QuizClient } from '@/components/quiz/quiz-client';
import { Panel } from '@/components/ui/panel';
import { Divider } from '@/components/ui/divider';

export const dynamic = 'force-dynamic';

export default async function QuizPage() {
  try {
    const payload = await getQuizPayload();

    return (
      <QuizClient
        dimensions={payload.dimensions as any}
        questions={payload.questions as any}
        levelsJson={payload.levels as any}
      />
    );
  } catch {
    return (
      <main className="container-narrow py-16">
        <Panel className="space-y-4">
          <div className="text-sm font-medium">Quiz unavailable</div>
          <Divider />
          <p className="text-sm text-muted">
            We couldn't load the assessment from the database. Run <code className="text-fg">pnpm setup</code> and refresh.
          </p>
        </Panel>
      </main>
    );
  }
}
