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
      <main className="container-max py-20">
        <div className="grid-overlay border border-border bg-bg p-12">
          <Panel className="rounded-none border border-border bg-panel p-8">
            <div className="label-mono text-[11px] text-muted">Assessment</div>
            <h1 className="mt-2 font-serif text-2xl leading-tight text-fg">Quiz unavailable</h1>

            <Divider className="my-6 border-border" />

            <p className="font-serif text-[15px] leading-relaxed text-fg/90">
              We couldn’t load the assessment from the database. Run{' '}
              <code className="label-mono border border-border bg-bg px-2 py-1 text-[11px] text-fg">pnpm setup</code>{' '}
              and refresh.
            </p>
          </Panel>
        </div>
      </main>
    );
  }
}
