# MaxMin Assessment - QA Checklist (Phase 8)

## Setup
- [ ] `npm run dev` starts without errors
- [ ] Supabase migrations applied (run Phase 8 migration)
- [ ] Seed data loaded (dimensions/questions/options/roadmap/settings)

## Quiz Flow (keyboard-only)
- [ ] Load `/assessment/quiz` with throttled network (Fast 3G)
- [ ] Skeleton shows; no layout jump
- [ ] Progress starts at **10%** at Q1
- [ ] ArrowUp/ArrowDown changes selection (focus visible)
- [ ] Enter advances (focus snaps to first option of next question)
- [ ] Esc clears selection
- [ ] Back restores previous selection
- [ ] Q24 submit shows preview (no crash)

## Gate + Submit
- [ ] Email required; company optional
- [ ] Submit returns token and redirects to `/results/[token]`
- [ ] Double-submit (refresh + submit again) returns same token (idempotency)
- [ ] Honeypot field (if filled) returns 400

## Results
- [ ] `/results/[token]` SSR renders without spinners
- [ ] Invalid token format shows premium not-found
- [ ] 404 token shows premium not-found
- [ ] Radar chart renders correctly
- [ ] Dimension cards expand/collapse

## OG Image
- [ ] `GET /api/og/[token]` returns 200 image (1200x630)
- [ ] No email/company appears in OG image URL
- [ ] Invalid token returns branded error

## PDF
- [ ] `GET /api/pdf/[token]` returns application/pdf
- [ ] Content matches ResultsDTO (level, primary gap, top 3 roadmap)
- [ ] Repeated downloads work correctly

## Health Endpoint
- [ ] `GET /api/health` returns `{ ok: true }` when DB is reachable
- [ ] Returns 503 when DB is unreachable

## Security Headers
- [ ] Response includes `X-Content-Type-Options: nosniff`
- [ ] Response includes `X-Frame-Options: DENY`
- [ ] Response includes `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] Response includes `Content-Security-Policy` header

## Failure Modes
- [ ] Rate limit returns `{ error: { code: "RATE_LIMITED" } }` with 429 status
- [ ] Large payload (>32KB) returns 413
- [ ] Invalid JSON returns 400
- [ ] Email failure does NOT block submit success
- [ ] No server logs contain raw email/company (check structured logs)

## Performance
- [ ] Quiz fetch completes in <500ms (single DB query)
- [ ] Results load with DTO caching (second request faster)
