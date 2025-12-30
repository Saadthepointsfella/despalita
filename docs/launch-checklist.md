# Launch Checklist (Phase 8)

## Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set to production URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (server only, never in client)
- [ ] `NEXT_PUBLIC_SITE_URL` set to production domain
- [ ] `RESEND_API_KEY` set (for transactional emails)
- [ ] `RESEND_FROM` set (verified sender address)
- [ ] Optional: `PDF_STORAGE_BUCKET` created in Supabase Storage

## Database
- [ ] All migrations applied in production
- [ ] Phase 8 hardening migration (`20251229080000_phase8_hardening.sql`) applied
- [ ] Seed ran successfully (dimensions/questions/options/roadmap/settings)
- [ ] RPC functions exist:
  - [ ] `submit_assessment` (original)
  - [ ] `submit_assessment_v1` (Phase 8, with FK enforcement)
- [ ] RPC permissions: executable by `service_role` only

## DNS / Email
- [ ] Resend domain verified
- [ ] SPF record configured
- [ ] DKIM record configured
- [ ] Test email received in Gmail
- [ ] Test email received in Outlook

## SSL / Security
- [ ] HTTPS enforced on all routes
- [ ] Security headers present (X-Frame-Options, CSP, etc.)
- [ ] API endpoints rate-limited

## Smoke Tests
- [ ] Submit quiz -> results -> pdf -> og works end-to-end
- [ ] Rate limit triggers correctly under rapid requests
- [ ] PII audit passes:
  - [ ] No email in OG images
  - [ ] No email in PDF
  - [ ] No email in URLs
  - [ ] No email in structured logs

## Deployment Order
1. Apply DB migrations
2. Run seed script (if fresh DB)
3. Deploy application
4. Verify `/api/health` returns ok
5. Run smoke test submission

## Monitoring Setup
- [ ] Error alerting configured (Vercel/Sentry)
- [ ] Monitor: submit error rate
- [ ] Monitor: results 404 rate
- [ ] Monitor: PDF generation failures
- [ ] Monitor: Resend email failures

## Rollback Plan
- [ ] Previous deployment accessible
- [ ] DB schema backward compatible (migrations are additive)
- [ ] Documented rollback steps
