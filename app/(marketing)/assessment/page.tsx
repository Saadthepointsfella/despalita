import { Panel } from '@/components/ui/panel';
import { SectionLabel } from '@/components/ui/section-label';
import { ArrowLink } from '@/components/ui/arrow-link';
import { Divider } from '@/components/ui/divider';

export default function AssessmentLandingPage() {
  return (
    <main className="container-narrow py-16">
      <header className="space-y-4">
        <h1 className="text-4xl font-semibold tracking-tightHeading">DTC Analytics Maturity Assessment</h1>
        <p className="text-muted">
          24 questions. 6 dimensions. A clear diagnosis, your biggest gap, and a priority roadmap.
        </p>
        <ArrowLink href="/assessment/quiz">Start the assessment</ArrowLink>
      </header>

      <div className="mt-10 space-y-6">
        <Panel className="space-y-4">
          <SectionLabel section="01" title="Overview" />
          <Divider />
          <p className="text-sm text-muted">
            This assessment measures how reliably your analytics stack turns data into decisions. It's built
            to be answerable by operators — no deep technical knowledge required.
          </p>
        </Panel>

        <Panel className="space-y-4">
          <SectionLabel section="02" title="How it works" />
          <Divider />
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
            <li>Answer 24 behavior-based questions.</li>
            <li>Get scored across six dimensions (tracking → infra).</li>
            <li>See your primary gap and the top three priorities.</li>
          </ul>
        </Panel>

        <Panel className="space-y-4">
          <SectionLabel section="03" title="What you get" />
          <Divider />
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
            <li>Level badge + concise summary.</li>
            <li>Dimension breakdown with tiered roadmap (Now/Next/Later).</li>
            <li>Tokenized share link + export-ready report later.</li>
          </ul>
        </Panel>
      </div>
    </main>
  );
}
