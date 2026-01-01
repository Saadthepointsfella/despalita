import * as React from 'react';
import { Panel } from '@/components/ui/panel';
import { Divider } from '@/components/ui/divider';

export function EmailGateForm({
  submitting,
  error,
  onSubmit,
}: {
  submitting: boolean;
  error: string | null;
  onSubmit: (data: { email: string; company?: string }) => void;
}) {
  const [email, setEmail] = React.useState('');
  const [company, setCompany] = React.useState('');
  const [emailError, setEmailError] = React.useState<string | null>(null);

  function validateEmail(value: string) {
    if (!value.trim()) return 'Enter a valid email address.';
    const input = value.trim();
    const ok = /\S+@\S+\.\S+/.test(input);
    return ok ? null : 'Enter a valid email address.';
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;

    onSubmit({
      email: email.trim(),
      company: company.trim() || undefined,
    });
  }

  return (
    <Panel className="space-y-6 rounded-none border border-border bg-panel p-8">
      <div>
        <div className="label-mono text-[11px] text-muted">Email gate</div>
        <div className="mt-2 font-serif text-2xl leading-tight text-fg">Unlock the full report</div>
        <div className="mt-2 text-sm text-muted">
          Get your shareable link and full roadmap. We'll email the report link (no spam).
        </div>
      </div>

      <Divider className="border-border" />

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div className="space-y-2">
          <label className="label-mono text-[11px] text-muted">Email (required)</label>
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError(null);
            }}
            className="w-full border border-border bg-bg px-4 py-3 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            placeholder="you@company.com"
            required
          />
          {emailError ? <div className="text-sm text-accent">{emailError}</div> : null}
        </div>

        <div className="space-y-2">
          <label className="label-mono text-[11px] text-muted">Company (optional)</label>
          <input
            type="text"
            name="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full border border-border bg-bg px-4 py-3 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            placeholder="Brand name"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={[
            'inline-flex items-center gap-3',
            'rounded-sm border border-black/15',
            'bg-[#121212] text-[#FAF9F6]',
            'px-5 py-3',
            'font-mono text-xs uppercase tracking-[0.22em]',
            'transition-opacity',
            submitting ? 'opacity-60' : 'hover:opacity-90',
          ].join(' ')}
        >
          {submitting ? 'Submitting...' : 'Unlock the full roadmap ->'}
        </button>
      </form>

      {error ? <div className="text-sm text-accent">{error}</div> : null}
    </Panel>
  );
}
