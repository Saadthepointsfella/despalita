import crypto from 'node:crypto';

export type LogLevel = 'info' | 'warn' | 'error';

/**
 * Get or generate a request ID for tracing.
 */
export function getRequestId(req: Request): string {
  return req.headers.get('x-request-id') ?? crypto.randomUUID();
}

/**
 * Structured JSON logger.
 * IMPORTANT: Never pass raw email/company in fields to avoid PII leakage.
 */
export function log(
  level: LogLevel,
  event: string,
  fields: Record<string, unknown> = {}
) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload));
}
