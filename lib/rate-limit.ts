/**
 * Fixed-window in-memory rate limiter with memory safety.
 * NOTE: Best-effort in serverless multi-instance. Swap for Redis later if needed.
 */

type Bucket = { count: number; resetAt: number; lastSeen: number };

const buckets = new Map<string, Bucket>();

const MAX_BUCKETS = 10_000;
const EVICT_AFTER_MS = 10 * 60_000; // 10 minutes

function sweep(now: number) {
  if (buckets.size <= MAX_BUCKETS) return;

  // Evict old buckets first
  const entries = Array.from(buckets.entries());
  for (const [k, b] of entries) {
    if (now - b.lastSeen > EVICT_AFTER_MS) buckets.delete(k);
    if (buckets.size <= MAX_BUCKETS) break;
  }
}

/**
 * Get client IP from request headers.
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Check rate limit for a key.
 * Returns whether the request is allowed and remaining quota.
 */
export function rateLimit(opts: {
  key: string;
  limit: number;
  windowMs: number;
}): { ok: boolean; remaining: number; resetInMs: number } {
  const now = Date.now();
  sweep(now);

  const b = buckets.get(opts.key);
  if (!b || now >= b.resetAt) {
    buckets.set(opts.key, {
      count: 1,
      resetAt: now + opts.windowMs,
      lastSeen: now,
    });
    return { ok: true, remaining: opts.limit - 1, resetInMs: opts.windowMs };
  }

  b.lastSeen = now;

  if (b.count >= opts.limit) {
    return { ok: false, remaining: 0, resetInMs: Math.max(0, b.resetAt - now) };
  }

  b.count += 1;
  return {
    ok: true,
    remaining: Math.max(0, opts.limit - b.count),
    resetInMs: Math.max(0, b.resetAt - now),
  };
}

// Legacy export for backwards compatibility
export { getClientIp as getRequestIp };
