import { apiError, apiOk } from '@/lib/api-response';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { parseJsonWithLimit } from '@/lib/api/parseJson';
import { submitRequestSchema } from '@/lib/assessment/submit-schema';
import { submitAssessment } from '@/lib/assessment/submitAssessment';
import { getResultsDto } from '@/lib/assessment/getResultsDto';
import { sendResultsEmail } from '@/lib/email/sendResultsEmail';
import { getRequestId, log } from '@/lib/log';

const MAX_PAYLOAD_BYTES = 32_000;

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const ip = getClientIp(req);

  // Rate limit
  const rl = rateLimit({ key: `submit:${ip}`, limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    log('warn', 'rate_limited', { requestId, ip });
    return apiError('RATE_LIMITED', 'Too many submissions. Try again shortly.', 429);
  }

  // Parse with payload limit
  let payload: unknown;
  try {
    payload = await parseJsonWithLimit(req, { maxBytes: MAX_PAYLOAD_BYTES });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'INVALID_JSON';
    if (msg === 'PAYLOAD_TOO_LARGE') {
      log('warn', 'payload_too_large', { requestId });
      return apiError('VALIDATION_ERROR', 'Payload too large.', 413);
    }
    return apiError('VALIDATION_ERROR', 'Invalid JSON body.', 400);
  }

  // Validate schema
  const parsed = submitRequestSchema.safeParse(payload);
  if (!parsed.success) {
    log('warn', 'validation_failed', { requestId });
    return apiError('VALIDATION_ERROR', 'Invalid submission payload.', 400);
  }

  try {
    const { token } = await submitAssessment(parsed.data);

    // Fire-and-forget email sending (don't block the response)
    // Never log email/PII
    void (async () => {
      try {
        const dto = await getResultsDto(token);
        if (dto) {
          await sendResultsEmail(parsed.data.email, dto);
        }
      } catch (err) {
        log('error', 'email_send_failed', {
          requestId,
          token,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    log('info', 'submit_ok', { requestId, token });

    const res = apiOk({ token });
    res.headers.set('x-request-id', requestId);
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error';

    if (msg === 'Honeypot triggered.') {
      log('warn', 'honeypot_triggered', { requestId });
      return apiError('VALIDATION_ERROR', 'Invalid submission.', 400);
    }

    if (msg === 'DB_ERROR') {
      log('error', 'submit_db_error', { requestId });
      return apiError('DB_ERROR', 'Could not store your submission. Please retry.', 500);
    }

    log('error', 'submit_error', { requestId, err: msg });
    return apiError('INTERNAL_ERROR', 'Unexpected error. Please retry.', 500);
  }
}
