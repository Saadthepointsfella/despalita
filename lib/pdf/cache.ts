import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';

/**
 * Optional PDF caching in Supabase Storage.
 * If PDF_STORAGE_BUCKET is not set, caching is disabled.
 */

const BUCKET = env.PDF_STORAGE_BUCKET;

function getStorageClient() {
  if (!BUCKET) return null;
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return null;

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  }).storage.from(BUCKET);
}

function pdfPath(token: string) {
  return `results/${token}.pdf`;
}

/**
 * Try to get cached PDF from Supabase Storage.
 * Returns null if not found or caching is disabled.
 */
export async function getCachedPdf(token: string): Promise<Uint8Array | null> {
  const storage = getStorageClient();
  if (!storage) return null;

  try {
    const { data, error } = await storage.download(pdfPath(token));
    if (error || !data) return null;

    return new Uint8Array(await data.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Cache a PDF in Supabase Storage.
 * Silently fails if caching is disabled.
 */
export async function cachePdf(token: string, pdfBytes: Uint8Array): Promise<void> {
  const storage = getStorageClient();
  if (!storage) return;

  try {
    await storage.upload(pdfPath(token), pdfBytes, {
      contentType: 'application/pdf',
      upsert: true,
    });
  } catch {
    // Silently fail - caching is optional
  }
}
