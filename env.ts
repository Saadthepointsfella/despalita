import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),

  /** Absolute base URL used in emails and PDF footer links. */
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),

  /** Resend transactional email (optional locally). */
  RESEND_API_KEY: z.string().min(10).optional(),
  RESEND_FROM: z.string().min(3).optional(),

  /** Optional: enable PDF caching in Supabase Storage */
  PDF_STORAGE_BUCKET: z.string().min(3).optional(),
});

export const env = envSchema.parse(process.env);
