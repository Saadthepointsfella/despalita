import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';

/**
 * Server-only admin client. Uses the service role key (never expose to the browser).
 * Intended for privileged server operations and internal tooling.
 */
export function createSupabaseAdminClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY (server-only).');
  }

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
