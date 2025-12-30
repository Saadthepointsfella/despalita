import { z } from 'zod';
import type { ScoreInput } from './types';
import type { ScoringConfig } from './types';
import { ScoringError } from './errors';

const answerSchema = z.object({
  question_id: z.string().min(1),
  option_id: z.string().min(1),
});

const inputSchema = z.object({
  answers: z.array(answerSchema),
});

export function validateAnswers(input: unknown, config: ScoringConfig): ScoreInput {
  const parsed = inputSchema.parse(input);

  if (parsed.answers.length !== 24) {
    throw new ScoringError('INVALID_INPUT', `Expected exactly 24 answers, got ${parsed.answers.length}.`);
  }

  const seen = new Set<string>();
  for (const a of parsed.answers) {
    if (seen.has(a.question_id)) {
      throw new ScoringError('INVALID_INPUT', `Duplicate question_id: ${a.question_id}.`);
    }
    seen.add(a.question_id);

    const q = config.questions_by_id[a.question_id];
    if (!q) throw new ScoringError('INVALID_INPUT', `Unknown question_id: ${a.question_id}.`);

    const score = q.option_scores[a.option_id];
    if (typeof score !== 'number') {
      throw new ScoringError('INVALID_INPUT', `Option ${a.option_id} does not belong to question ${a.question_id}.`);
    }
    if (score < 1 || score > 5) {
      throw new ScoringError('INVALID_INPUT', `Invalid score for option ${a.option_id}.`);
    }
  }

  // Ensure completeness: must include all question ids from config.
  const configQuestionIds = Object.keys(config.questions_by_id);
  for (const qid of configQuestionIds) {
    if (!seen.has(qid)) throw new ScoringError('INVALID_INPUT', `Missing answer for question_id: ${qid}.`);
  }

  return parsed;
}
