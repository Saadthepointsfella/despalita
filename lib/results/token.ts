// Base62 token validation (Phase 4 recommends >= 12 chars)
export function isValidResultsToken(token: string): boolean {
  if (!token) return false;
  if (token.length < 12 || token.length > 32) return false;
  return /^[0-9A-Za-z]+$/.test(token);
}
