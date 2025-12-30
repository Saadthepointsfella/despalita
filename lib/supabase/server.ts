import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';

export function createSupabaseServerClient() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}
