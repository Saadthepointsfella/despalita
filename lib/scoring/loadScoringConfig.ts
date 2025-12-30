import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { env } from '@/env';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { ScoringConfig } from './types';
import { normalizeScoringConfig } from './normalizeConfig';
import { ScoringError } from './errors';

const CACHE_TTL_MS = 60_000;

let cached: { config: ScoringConfig; loadedAt: number } | null = null;
let inFlight: Promise<ScoringConfig> | null = null;

function getClient() {
  // Prefer service role if available (server-only), otherwise fall back to anon key.
  if (env.SUPABASE_SERVICE_ROLE_KEY) return createSupabaseAdminClient();
  return createSupabaseServerClient();
}

async function fetchAppSetting(key: string) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) throw error;
  if (!data?.value) throw new ScoringError('CONFIG_MISSING', `Missing app_settings key: ${key}`);
  return data.value;
}

async function loadFresh(): Promise<ScoringConfig> {
  const supabase = getClient();

  const [{ data: dims, error: dErr }, { data: qs, error: qErr }, { data: opts, error: oErr }] = await Promise.all([
    supabase.from('dimensions').select('id,order,section,short_label,name,weight'),
    supabase.from('questions').select('id,order,dimension_id'),
    supabase.from('options').select('id,question_id,score'),
  ]);

  if (dErr) throw dErr;
  if (qErr) throw qErr;
  if (oErr) throw oErr;

  const levelsValue = await fetchAppSetting('levels');
  const scoringRulesValue = await fetchAppSetting('scoring_rules');

  return normalizeScoringConfig({
    dimensions: dims ?? [],
    questions: qs ?? [],
    options: opts ?? [],
    levelsValue,
    scoringRulesValue,
  });
}

/**
 * Loads scoring config from DB (seeded from /config) with a short in-memory cache.
 * Deterministic: all scoring decisions are driven by config data.
 */
export async function loadScoringConfig(): Promise<ScoringConfig> {
  const now = Date.now();
  if (cached && now - cached.loadedAt < CACHE_TTL_MS) return cached.config;
  if (inFlight) return inFlight;

  inFlight = loadFresh()
    .then((cfg) => {
      cached = { config: cfg, loadedAt: Date.now() };
      return cfg;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/** Testing / dev utility: clears in-memory config cache. */
export function __clearScoringConfigCache() {
  cached = null;
  inFlight = null;
}
