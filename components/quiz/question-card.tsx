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
    <Panel className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tightHeading">{prompt}</h2>
        {helper ? <p className="font-mono text-xs text-muted">{helper}</p> : null}
      </div>
      <Divider />
      <div className="space-y-3">{children}</div>
    </Panel>
  );
}
