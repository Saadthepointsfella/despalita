# Runbook (Phase 8)

## Health Check

**Endpoint:** `GET /api/health`

**Expected Response:**
```json
{ "ok": true, "ts": "2024-12-29T12:00:00.000Z" }
```

**If it fails with DB_ERROR:**
1. Check Supabase connectivity in Vercel logs
2. Verify environment variables are set correctly
3. Check Supabase dashboard for service status
4. Verify RLS policies aren't blocking service role

---

## Common Incidents

### Submit Spikes / Abuse

**Symptoms:**
- Many 429 responses in logs
- High DB load
- Unusual submission patterns

**Actions:**
1. Verify rate limiter is working (`rateLimit` function)
2. Check logs for repeat IPs: `log('warn', 'rate_limited', ...)`
3. Current limits: 10 submissions/minute per IP
4. Consider tightening limits in production
5. Enable Vercel WAF or edge protection if needed

### Results Endpoint Hammered

**Symptoms:**
- High DB reads for same token
- Slow response times
- Elevated latency metrics

**Actions:**
1. Verify TTL cache is working (`lib/cache/ttl.ts`)
2. Cache TTL is 30 seconds by default
3. Consider CDN caching (results are immutable after creation)
4. Check for bot traffic patterns

### PDF Generation Slow

**Symptoms:**
- High latency on `/api/pdf/[token]`
- Timeouts reported
- Memory warnings

**Actions:**
1. PDF caching reduces repeat generation
2. If `PDF_STORAGE_BUCKET` is set, check Supabase Storage
3. PDF generation is synchronous; monitor function duration
4. Consider increasing Vercel function timeout if needed

### Email Failures

**Symptoms:**
- Resend errors in logs: `log('error', 'email_send_failed', ...)`
- Users not receiving result emails

**Actions:**
1. Check Resend dashboard for delivery issues
2. Verify DNS records (SPF/DKIM) are correct
3. Check for rate limits on Resend side
4. Email failures are best-effort - submit always succeeds
5. Users can access results via token URL

### Database Errors

**Symptoms:**
- `DB_ERROR` responses from submit
- RPC function failures
- FK constraint violations

**Actions:**
1. Check if `submit_assessment_v1` RPC exists
2. Verify FK constraints on answers table
3. Check if question_id/option_id exist in database
4. Review seed data for completeness
5. Check Supabase logs for detailed error messages

---

## Log Analysis

### Structured Log Format
```json
{
  "ts": "2024-12-29T12:00:00.000Z",
  "level": "info|warn|error",
  "event": "submit_ok|rate_limited|email_send_failed|...",
  "requestId": "uuid",
  "token": "...",
  ...
}
```

### Key Events to Monitor
- `submit_ok` - Successful submission
- `rate_limited` - Rate limit triggered
- `payload_too_large` - Payload exceeded 32KB
- `validation_failed` - Zod validation failed
- `honeypot_triggered` - Bot detected
- `submit_db_error` - Database error during submit
- `email_send_failed` - Email delivery failed
- `results_not_found` - Token lookup failed

### Finding Issues by Request ID
1. Get `x-request-id` from response headers
2. Search logs for that UUID
3. Trace full request lifecycle

---

## Emergency Procedures

### Disable Email Sending
Remove or unset `RESEND_API_KEY` environment variable.
Email will silently skip without affecting submit flow.

### Rate Limit Emergency Increase
Edit `lib/rate-limit.ts`:
```typescript
// Increase from 10 to 50 per minute
const rl = rateLimit({ key: `submit:${ip}`, limit: 50, windowMs: 60_000 });
```

### Disable Payload Size Check
Edit `app/api/assessment/submit/route.ts`:
```typescript
const MAX_PAYLOAD_BYTES = 1_000_000; // 1MB temporary
```

### Force Use Original RPC
If `submit_assessment_v1` has issues, the code auto-falls back to `submit_assessment`.
To force original only, remove v1 function from DB.
