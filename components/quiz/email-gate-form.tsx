'use client';

import * as React from 'react';
import { Panel } from '@/components/ui/panel';
import { Divider } from '@/components/ui/divider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function EmailGateForm({
  onSubmit,
  submitting,
  error,
}: {
  onSubmit: (data: { email: string; company?: string }) => void;
  submitting: boolean;
  error?: string | null;
}) {
  const [email, setEmail] = React.useState('');
  const [company, setCompany] = React.useState('');
  const [touched, setTouched] = React.useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!emailValid) return;
    onSubmit({ email, company: company.trim() || undefined });
  }

  return (
    <Panel className="space-y-4">
      <div>
        <div className="font-mono text-xs text-muted">Email gate</div>
        <h3 className="mt-1 text-lg font-semibold tracking-tightHeading">Unlock the full report</h3>
        <p className="mt-1 text-sm text-muted">
          Get your shareable link + full roadmap. We'll email the report link (no spam).
        </p>
      </div>

      <Divider />

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label className="font-mono text-xs text-muted" htmlFor="email">
            Email (required)
          </label>
          <Input
            id="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            disabled={submitting}
          />
          {touched && !emailValid ? <div className="text-xs text-accent">Enter a valid email address.</div> : null}
        </div>

        <div className="space-y-1">
          <label className="font-mono text-xs text-muted" htmlFor="company">
            Company (optional)
          </label>
          <Input
            id="company"
            autoComplete="organization"
            placeholder="Brand name"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            disabled={submitting}
          />
        </div>

        {error ? <div className="rounded-control border border-accent/50 bg-accent/10 p-3 text-sm text-accent">{error}</div> : null}

        <Button type="submit" disabled={!emailValid || submitting}>
          {submitting ? 'Generating your report…' : 'Unlock the full roadmap →'}
        </Button>
      </form>
    </Panel>
  );
}
