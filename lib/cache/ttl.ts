/**
 * Simple in-memory TTL cache.
 * Used for short-lived caching (e.g., results DTO) to reduce DB reads.
 */

type Entry<T> = { value: T; expiresAt: number };
const cache = new Map<string, Entry<unknown>>();

const MAX_ENTRIES = 1000;

function sweep() {
  if (cache.size <= MAX_ENTRIES) return;
  const now = Date.now();
  const entries = Array.from(cache.entries());
  for (const [k, e] of entries) {
    if (now > e.expiresAt) cache.delete(k);
    if (cache.size <= MAX_ENTRIES) break;
  }
}

/**
 * Get a cached value if it exists and hasn't expired.
 */
export function getTtl<T>(key: string): T | null {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    cache.delete(key);
    return null;
  }
  return e.value as T;
}

/**
 * Set a cached value with a TTL in milliseconds.
 */
export function setTtl<T>(key: string, value: T, ttlMs: number) {
  sweep();
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Clear a specific cache key.
 */
export function clearTtl(key: string) {
  cache.delete(key);
}
