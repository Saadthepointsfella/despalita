import { Panel } from '@/components/ui/panel';
import { Divider } from '@/components/ui/divider';

export default function Loading() {
  return (
    <main className="container-max py-12 space-y-10">
      <Panel className="space-y-4">
        <div className="h-4 w-40 rounded-control bg-border/60 animate-pulse" />
        <Divider />
        <div className="h-8 w-3/5 rounded-control bg-border/60 animate-pulse" />
        <div className="h-4 w-4/5 rounded-control bg-border/60 animate-pulse" />
      </Panel>

      <section className="grid gap-6 md:grid-cols-2">
        <Panel className="space-y-4">
          <div className="h-4 w-32 rounded-control bg-border/60 animate-pulse" />
          <Divider />
          <div className="h-64 w-full rounded-card bg-border/40 animate-pulse" />
        </Panel>
        <Panel className="space-y-4">
          <div className="h-4 w-32 rounded-control bg-border/60 animate-pulse" />
          <Divider />
          <div className="h-32 w-full rounded-card bg-border/40 animate-pulse" />
        </Panel>
      </section>

      <Panel className="space-y-4">
        <div className="h-4 w-40 rounded-control bg-border/60 animate-pulse" />
        <Divider />
        <div className="h-40 w-full rounded-card bg-border/40 animate-pulse" />
      </Panel>
    </main>
  );
}
