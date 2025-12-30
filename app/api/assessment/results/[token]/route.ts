import { apiError, apiOk } from '@/lib/api-response';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { isValidResultToken } from '@/lib/tokens';
import { getResultsDtoByToken } from '@/lib/assessment/getResultsDto';
import { getRequestId, log } from '@/lib/log';

export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const requestId = getRequestId(req);
  const { token } = await ctx.params;

  // Validate token format first (fast fail)
  if (!isValidResultToken(token)) {
    return apiError('NOT_FOUND', 'Results not found.', 404);
  }

  // Rate limit
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `results:${ip}`, limit: 120, windowMs: 60_000 });
  if (!rl.ok) {
    log('warn', 'rate_limited', { requestId, ip, endpoint: 'results' });
    return apiError('RATE_LIMITED', 'Too many requests.', 429);
  }

  const dto = await getResultsDtoByToken(token);
  if (!dto) {
    log('info', 'results_not_found', { requestId, token });
    return apiError('NOT_FOUND', 'Results not found.', 404);
  }

  const res = apiOk(dto);
  res.headers.set('x-request-id', requestId);
  return res;
}
