import { createHash } from 'node:crypto';

export type AnswerPair = { question_id: string; option_id: string };

/**
 * Stable idempotency hash: normalized_email + sorted answers (question_id:option_id)
 * Does NOT include timings or company (retries should match).
 */
export function computeSubmissionHash(input: { email: string; answers: AnswerPair[] }): string {
  const email = input.email.trim().toLowerCase();
  const pairs = [...input.answers]
    .slice()
    .sort((a, b) => a.question_id.localeCompare(b.question_id))
    .map((a) => `${a.question_id}:${a.option_id}`)
    .join('|');

  return createHash('sha256').update(`${email}::${pairs}`).digest('hex');
}
