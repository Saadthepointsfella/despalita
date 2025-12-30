/**
 * Clamp text to a maximum length with ellipsis.
 * Used for OG image text that needs to fit within bounds.
 */
export function clamp(text: string | null | undefined, maxLen: number): string {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1).trimEnd() + '\u2026';
}
