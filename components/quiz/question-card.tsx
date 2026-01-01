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
    <Panel className="relative rounded-none border border-border bg-panel p-5 sm:p-6 md:p-8">
      {/* red rule-left */}
      <div className="absolute left-0 top-0 h-full w-1 bg-accent" aria-hidden="true" />

      <div className="space-y-3">
        <h2 className="font-serif text-[20px] leading-tight text-fg sm:text-[22px]">{prompt}</h2>
        {helper ? (
          <p className="label-mono hidden text-[11px] text-muted sm:block">{helper}</p>
        ) : null}
      </div>

      <Divider className="my-5 border-border sm:my-6" />

      <div className="space-y-3">{children}</div>
    </Panel>
  );
}
