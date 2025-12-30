/**
 * Token utilities - re-exports for backward compatibility.
 * NOTE: This file uses server-only. For edge runtime, import from lib/tokens/validate directly.
 */
import 'server-only';

export { generateBase62Token, generateResultToken } from './tokens/generate';
export { isValidResultToken } from './tokens/validate';
