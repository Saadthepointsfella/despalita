/**
 * Token validation - safe for edge runtime (no node: imports)
 */

export function isValidResultToken(token: string): boolean {
  // base62 12..32
  return /^[0-9A-Za-z]{12,32}$/.test(token);
}
