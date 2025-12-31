import { Panel } from '@/components/ui/panel';
import { Divider } from '@/components/ui/divider';

export function QuestionCard({
  prompt,
  helper,
  children,
}: {
  prompt: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <Panel className="relative rounded-none border border-border bg-panel p-8">
      {/* red rule-left */}
      <div className="absolute left-0 top-0 h-full w-1 bg-accent" aria-hidden="true" />

      <div className="space-y-3">
        <h2 className="font-serif text-[22px] leading-tight text-fg">{prompt}</h2>
        {helper ? <p className="label-mono text-[11px] text-muted">{helper}</p> : null}
      </div>

      <Divider className="my-6 border-border" />

      <div className="space-y-3">{children}</div>
    </Panel>
  );
}
