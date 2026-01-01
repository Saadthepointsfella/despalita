import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  SUPABASE_ANON_KEY: z.string().min(20).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),

  /** Absolute base URL used in emails and PDF footer links. */
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),

  /** Resend transactional email (optional locally). */
  RESEND_API_KEY: z.string().min(10).optional(),
  RESEND_FROM: z.string().min(3).optional(),

  /** Optional: enable PDF caching in Supabase Storage */
  PDF_STORAGE_BUCKET: z.string().min(3).optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const missing = parsed.error.issues
    .map((issue) => issue.path.join('.'))
    .filter(Boolean)
    .join(', ');
  throw new Error(`Invalid or missing environment variables: ${missing}`);
}

const supabaseUrl = parsed.data.NEXT_PUBLIC_SUPABASE_URL ?? parsed.data.SUPABASE_URL;
const supabaseAnon =
  parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? parsed.data.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

export const env = {
  ...parsed.data,
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnon,
};
