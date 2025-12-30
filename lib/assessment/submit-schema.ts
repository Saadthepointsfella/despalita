import { z } from 'zod';

const utmSchema = z
  .object({
    source: z.string().max(80).optional(),
    medium: z.string().max(80).optional(),
    campaign: z.string().max(120).optional(),
    term: z.string().max(120).optional(),
    content: z.string().max(120).optional(),
  })
  .strict()
  .optional();

const answerSchema = z.object({
  question_id: z.string().min(1),
  option_id: z.string().min(1),
});

const timingSchema = z.object({
  question_id: z.string().min(1),
  time_spent_ms: z.number().int().min(0).max(10 * 60 * 1000), // cap at 10 minutes per question
});

export const submitRequestSchema = z
  .object({
    email: z.string().email(),
    company: z.string().max(160).optional(),
    answers: z.array(answerSchema).length(24),
    timings: z.array(timingSchema).optional(),
    utm: utmSchema,
    // honeypot: if present and filled => reject
    website: z.string().optional(),
  })
  .strict();

export type SubmitRequest = z.infer<typeof submitRequestSchema>;

export function normalizeSubmitRequest(req: SubmitRequest) {
  const email = req.email.trim().toLowerCase();
  const company = req.company?.trim() || undefined;

  // enforce unique question_ids
  const seen = new Set<string>();
  for (const a of req.answers) {
    if (seen.has(a.question_id)) {
      throw new Error(`Duplicate question_id: ${a.question_id}`);
    }
    seen.add(a.question_id);
  }

  // normalize timings into lookup (optional)
  const timingMap: Record<string, number> = {};
  for (const t of req.timings ?? []) {
    if (t.time_spent_ms < 0) continue;
    timingMap[t.question_id] = Math.min(10 * 60 * 1000, t.time_spent_ms);
  }

  return {
    email,
    company,
    answers: req.answers,
    timingMap,
    utm: req.utm ?? undefined,
    honeypot: (req.website ?? '').trim(),
  };
}
