// src/lib/scoring.ts
import 'server-only';

import type { QuizAnswerDraft, DimensionKey, Tier, LeadTier, LevelKey } from '@/types/quiz';
import { questions, dimensions, scoringRules, getLevelByScore, getTierByDimensionScore } from './config';

export interface DimensionScore {
  dimension_id: DimensionKey;
  score: number;
  tier: Tier;
}

export interface ScoringResult {
  overall_score: number;
  base_overall_score: number;

  // locked to config
  level: number; // 1..5
  level_key: LevelKey;
  level_name: string;

  dimension_scores: DimensionScore[];
  gaps: {
    primary_gap: DimensionKey;
    critical_gaps: DimensionKey[];
    foundation_gaps: DimensionKey[];
  };
  cta_tone: LeadTier;
  cta_reason: string;
}

type Logger = (event: {
  name: string;
  payload: Record<string, unknown>;
}) => void;

export class AnswerValidationError extends Error {
  public readonly code = 'INVALID_ANSWERS';
  public readonly issues: Record<string, unknown>;

  constructor(message: string, issues: Record<string, unknown>) {
    super(message);
    this.name = 'AnswerValidationError';
    this.issues = issues;
  }
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// Pre-index questions/options once (O(1) lookups)
const QUESTION_BY_ID = new Map(questions.map(q => [q.id, q]));
const OPTION_SCORE_BY_QUESTION_ID = new Map<string, Map<string, number>>(
  questions.map(q => [
    q.id,
    new Map(q.options.map(o => [o.id, o.score])),
  ])
);

function validateAnswersOrThrow(answers: QuizAnswerDraft[], logger?: Logger) {
  const unknown_questions: string[] = [];
  const invalid_options: Array<{ question_id: string; option_id: string }> = [];
  const duplicate_questions: string[] = [];

  const seen = new Set<string>();

  for (const a of answers) {
    const qId = a.questionId;
    const oId = a.optionId;

    if (!QUESTION_BY_ID.has(qId)) {
      unknown_questions.push(qId);
      continue;
    }

    if (seen.has(qId)) duplicate_questions.push(qId);
    seen.add(qId);

    const optionMap = OPTION_SCORE_BY_QUESTION_ID.get(qId);
    if (!optionMap || !optionMap.has(oId)) {
      invalid_options.push({ question_id: qId, option_id: oId });
    }
  }

  const allQuestionIds = questions.map(q => q.id);
  const missing_questions = allQuestionIds.filter(id => !seen.has(id));

  const hasIssues =
    unknown_questions.length > 0 ||
    invalid_options.length > 0 ||
    duplicate_questions.length > 0 ||
    missing_questions.length > 0;

  if (hasIssues) {
    const issues = {
      expected_answer_count: questions.length,
      received_answer_count: answers.length,
      unknown_questions,
      invalid_options,
      duplicate_questions,
      missing_questions,
    };

    logger?.({
      name: 'quiz_answer_validation_failed',
      payload: issues,
    });

    throw new AnswerValidationError('Invalid quiz answers payload', issues);
  }
}

function compare(op: string, left: number, right: number): boolean {
  switch (op) {
    case 'gte': return left >= right;
    case 'gt': return left > right;
    case 'lte': return left <= right;
    case 'lt': return left < right;
    case 'eq': return left === right;
    default: return false;
  }
}

export function calculateScores(
  answers: QuizAnswerDraft[],
  opts?: { logger?: Logger }
): ScoringResult {
  const logger = opts?.logger;

  validateAnswersOrThrow(answers, logger);

  const { rounding, gaps: gapRules, overall_scoring, cta_rules } = scoringRules;
  const decimalPlaces = rounding.score_decimal_places as number;

  // question_id -> score
  const answerScores = new Map<string, number>();
  for (const a of answers) {
    const optionScore = OPTION_SCORE_BY_QUESTION_ID.get(a.questionId)!.get(a.optionId)!;
    answerScores.set(a.questionId, optionScore);
  }

  // Dimension scores (strict: exactly 4 questions each by config)
  const dimensionScores: DimensionScore[] = [];

  for (const dim of dimensions) {
    const dimQuestions = questions.filter(q => q.dimension_id === dim.id);
    const scores = dimQuestions.map(q => answerScores.get(q.id)!);

    const avg = scores.reduce((s, x) => s + x, 0) / scores.length;
    const score = round(avg, decimalPlaces);
    const tier = getTierByDimensionScore(score);

    dimensionScores.push({
      dimension_id: dim.id as DimensionKey,
      score,
      tier: tier as Tier,
    });
  }

  // Base overall score
  const baseOverallScore = round(
    dimensionScores.reduce((sum, d) => sum + d.score, 0) / dimensionScores.length,
    decimalPlaces
  );

  // Weakest-link cap
  const minDim = dimensionScores.reduce((min, d) => (d.score < min.score ? d : min), dimensionScores[0]);
  let overallScore = baseOverallScore;

  if (
    overall_scoring.weakest_link.enabled &&
    minDim.score < overall_scoring.weakest_link.trigger_min_dim_lt
  ) {
    const cap = minDim.score + overall_scoring.weakest_link.cap_delta;
    overallScore = round(Math.min(baseOverallScore, cap), decimalPlaces);
  }

  // Level
  const levelObj = getLevelByScore(overallScore);

  // Gaps
  const primaryGap = minDim.dimension_id as DimensionKey;

  const criticalGaps = dimensionScores
    .filter(d => d.score < baseOverallScore - gapRules.critical_gap.delta)
    .map(d => d.dimension_id as DimensionKey);

  const foundationGaps = dimensionScores
    .filter(d => d.score < gapRules.foundation_gap.threshold)
    .map(d => d.dimension_id as DimensionKey);

  // CTA tone (priority ordered)
  let ctaTone: LeadTier = 'cool' as LeadTier;
  let ctaReason = 'No foundational or critical gaps; optimization posture.';

  const facts: Record<string, number> = {
    foundation_gap_count: foundationGaps.length,
    critical_gap_count: criticalGaps.length,
  };

  const sortedRules = [...cta_rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    const matches = rule.when.length === 0
      ? true
      : rule.when.every((cond: any) => {
          const left = facts[cond.fact] ?? 0;
          const right = Number(cond.value);
          return compare(cond.op, left, right);
        });

    if (matches) {
      ctaTone = rule.then.cta_tone as LeadTier;
      ctaReason = rule.then.reason;
      break;
    }
  }

  return {
    overall_score: overallScore,
    base_overall_score: baseOverallScore,

    level: levelObj.level,
    level_key: levelObj.key as LevelKey,
    level_name: levelObj.name,

    dimension_scores: dimensionScores,
    gaps: {
      primary_gap: primaryGap,
      critical_gaps: criticalGaps,
      foundation_gaps: foundationGaps,
    },
    cta_tone: ctaTone,
    cta_reason: ctaReason,
  };
}
