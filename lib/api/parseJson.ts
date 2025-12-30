/**
 * Parse JSON with payload size limit.
 * Prevents abuse + accidental huge payloads before Zod runs.
 */
export async function parseJsonWithLimit<T>(
  req: Request,
  opts: { maxBytes: number }
): Promise<T> {
  const text = await req.text();

  // Check byte size after decoding
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > opts.maxBytes) {
    throw new Error('PAYLOAD_TOO_LARGE');
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('INVALID_JSON');
  }
}
