/**
 * Token generation - server-only (uses node:crypto)
 */
import 'server-only';
import { randomBytes } from 'node:crypto';

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function generateBase62Token(length: number): string {
  if (length < 8) throw new Error('Token length too short.');
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += BASE62[bytes[i]! % BASE62.length];
  }
  return out;
}

export function generateResultToken(): string {
  // 14 chars base62 ~= 83 bits of entropy (good for unguessable tokens)
  return generateBase62Token(14);
}
