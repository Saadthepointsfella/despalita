import { z } from 'zod';
import type { DimensionKey } from '@/types/quiz';
import type { LoadedLevel, ScoringConfig, ScoringRules } from './types';
import { ScoringError } from './errors';

const dimensionRowSchema = z.object({
  id: z.string(),
  order: z.number().int(),
  section: z.string(),
  short_label: z.string(),
  name: z.string(),
  weight: z.number().optional().default(1),
});

const questionRowSchema = z.object({
  id: z.string(),
  order: z.number().int(),
  dimension_id: z.string(),
});

const optionRowSchema = z.object({
  id: z.string(),
  question_id: z.string(),
  score: z.number().int().min(1).max(5),
});

const levelsJsonSchema = z.object({
  version: z.string().optional(),
  levels: z.array(
    z.object({
      level: z.number().int().min(1).max(5),
      key: z.string(),
      name: z.string(),
      hero_title: z.string(),
      hero_copy: z.string(),
      color_token: z.string(),
      score_range: z.object({
        min: z.number(),
        max: z.number(),
        min_inclusive: z.boolean(),
        max_inclusive: z.boolean(),
      }),
    }),
  ),
});

const tierSchema = z.object({
  tier: z.enum(['low', 'medium', 'high']),
  min: z.number(),
  max: z.number(),
  min_inclusive: z.boolean(),
  max_inclusive: z.boolean(),
});

const ctaRuleSchema = z.object({
  id: z.string(),
  priority: z.number().int(),
  when: z.array(
    z.object({
      fact: z.string(),
      op: z.enum(['gte', 'gt', 'lte', 'lt', 'eq', 'neq']),
      value: z.union([z.number(), z.boolean(), z.string()]),
    }),
  ),
  then: z.object({
    cta_tone: z.enum(['hot', 'warm', 'cool']),
    reason: z.string(),
  }),
});

const scoringRulesSchema = z
  .object({
    version: z.string().optional(),
    rounding: z.object({
      score_decimal_places: z.number().int().min(0).max(6),
      display_decimal_places: z.number().int().min(0).max(6),
    }),
    tier_thresholds: z.object({
      tiers: z.array(tierSchema).min(1),
    }),
    overall_scoring: z.object({
      weakest_link: z.object({
        enabled: z.boolean(),
        trigger_min_dim_lt: z.number(),
        cap_delta: z.number(),
      }),
    }),
    gaps: z.object({
      critical_gap: z.object({ delta: z.number() }),
      foundation_gap: z.object({ threshold: z.number() }),
    }),
    cta_rules: z.array(ctaRuleSchema),
  })
  .transform((v) => {
    // Strip version while keeping the runtime object stable.
    const { version: _version, ...rest } = v;
    return rest as ScoringRules;
  });

type NormalizeInput = {
  dimensions: unknown[];
  questions: unknown[];
  options: unknown[];
  levelsValue: unknown;
  scoringRulesValue: unknown;
};

function asDimensionKey(x: string): DimensionKey {
  return x as DimensionKey;
}

export function normalizeScoringConfig(input: NormalizeInput): ScoringConfig {
  const dims = z.array(dimensionRowSchema).parse(input.dimensions);
  const qs = z.array(questionRowSchema).parse(input.questions);
  const opts = z.array(optionRowSchema).parse(input.options);
  const levelsJson = levelsJsonSchema.parse(input.levelsValue);
  const rulesRaw = scoringRulesSchema.parse(input.scoringRulesValue);

  // Levels: keep only the fields we need and enforce sorting by level asc.
  const levels: LoadedLevel[] = levelsJson.levels
    .map((l) => ({
      level: l.level as 1 | 2 | 3 | 4 | 5,
      key: l.key as any,
      name: l.name,
      hero_title: l.hero_title,
      hero_copy: l.hero_copy,
      color_token: l.color_token,
      score_range: l.score_range,
    }))
    .sort((a, b) => a.level - b.level);

  // Normalize dimensions
  const dimensions = dims
    .map((d) => ({
      id: asDimensionKey(d.id),
      order: d.order,
      section: d.section,
      short_label: d.short_label,
      name: d.name,
      weight: d.weight ?? 1,
    }))
    .sort((a, b) => a.order - b.order);

  if (dimensions.length !== 6) {
    throw new ScoringError('CONFIG_INVALID', `Expected 6 dimensions, got ${dimensions.length}.`);
  }

  // Normalize questions
  const questions = qs
    .map((q) => ({
      id: q.id,
      order: q.order,
      dimension_id: asDimensionKey(q.dimension_id),
      option_scores: {} as Record<string, number>,
    }))
    .sort((a, b) => a.order - b.order);

  if (questions.length !== 24) {
    throw new ScoringError('CONFIG_INVALID', `Expected 24 questions, got ${questions.length}.`);
  }

  const questionsById: Record<string, ScoringConfig['questions'][number]> = {};
  for (const q of questions) questionsById[q.id] = q;

  // Attach option scores per question and validate option counts
  for (const o of opts) {
    const q = questionsById[o.question_id];
    if (!q) continue;
    q.option_scores[o.id] = o.score;
  }

  for (const q of questions) {
    const optionCount = Object.keys(q.option_scores).length;
    if (optionCount !== 5) {
      throw new ScoringError(
        'CONFIG_INVALID',
        `Question ${q.id} expected 5 options, got ${optionCount}.`,
      );
    }
  }

  // Derived maps
  const dimensionOrder: Record<DimensionKey, number> = {} as any;
  const questionIdsByDim: Record<DimensionKey, string[]> = {} as any;

  for (const d of dimensions) {
    dimensionOrder[d.id] = d.order;
    questionIdsByDim[d.id] = [];
  }

  for (const q of questions) {
    if (!questionIdsByDim[q.dimension_id]) {
      throw new ScoringError('CONFIG_INVALID', `Question ${q.id} references unknown dimension ${q.dimension_id}.`);
    }
    questionIdsByDim[q.dimension_id].push(q.id);
  }

  for (const [dim, ids] of Object.entries(questionIdsByDim)) {
    if (ids.length !== 4) {
      throw new ScoringError('CONFIG_INVALID', `Dimension ${dim} expected 4 questions, got ${ids.length}.`);
    }
  }

  return {
    dimensions,
    questions,
    levels,
    rules: rulesRaw,
    dimension_order: dimensionOrder,
    questions_by_id: questionsById,
    question_ids_by_dimension: questionIdsByDim,
  };
}
