import 'server-only';
import { headers } from 'next/headers';
import type { ResultsDTO } from './types';

function getBaseUrl(): string {
  // Prefer explicit envs when deployed
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) return site.startsWith('http') ? site : `https://${site}`;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;

  // Fallback to request host (dev / preview)
  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'http';
  if (!host) return 'http://localhost:3000';
  return `${proto}://${host}`;
}

export type FetchResultsResponse =
  | { ok: true; data: ResultsDTO }
  | { ok: false; status: number; error: { code: string; message: string } };

export async function fetchResultsDto(token: string): Promise<FetchResultsResponse> {
  const base = getBaseUrl();

  const res = await fetch(`${base}/api/assessment/results/${token}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (res.ok) {
    const data = (await res.json()) as ResultsDTO;
    return { ok: true, data };
  }

  const json = await res.json().catch(() => null) as any;
  const error =
    json?.error?.code && json?.error?.message
      ? json.error
      : { code: 'UNKNOWN', message: 'Unable to load results.' };

  return { ok: false, status: res.status, error };
}
