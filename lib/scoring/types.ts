import type { DimensionKey, LeadTier, LevelKey, Tier } from '@/types/quiz';

export type ScoreAnswer = { question_id: string; option_id: string };

export type ScoreInput = {
  answers: ScoreAnswer[];
};

export type LevelRange = {
  min: number;
  max: number;
  min_inclusive: boolean;
  max_inclusive: boolean;
};

export type LoadedLevel = {
  level: 1 | 2 | 3 | 4 | 5;
  key: LevelKey;
  name: string;
  hero_title: string;
  hero_copy: string;
  color_token: string;
  score_range: LevelRange;
};

export type TierRange = {
  tier: Tier;
  min: number;
  max: number;
  min_inclusive: boolean;
  max_inclusive: boolean;
};

export type CtaRuleCondition = {
  fact: string;
  op: 'gte' | 'gt' | 'lte' | 'lt' | 'eq' | 'neq';
  value: number | boolean | string;
};

export type CtaRule = {
  id: string;
  priority: number;
  when: CtaRuleCondition[];
  then: {
    cta_tone: LeadTier;
    reason: string;
  };
};

export type ScoringRules = {
  rounding: {
    score_decimal_places: number;
    display_decimal_places: number;
  };
  tier_thresholds: {
    tiers: TierRange[];
  };
  overall_scoring: {
    weakest_link: {
      enabled: boolean;
      trigger_min_dim_lt: number;
      cap_delta: number;
    };
  };
  gaps: {
    critical_gap: { delta: number };
    foundation_gap: { threshold: number };
  };
  cta_rules: CtaRule[];
};

export type ScoringConfig = {
  // Dimension order is used for deterministic tie-breaking.
  dimensions: Array<{
    id: DimensionKey;
    order: number;
    section: string;
    short_label: string;
    name: string;
    weight: number;
  }>;

  // All questions and their option scores (needed to validate option belongs to question).
  questions: Array<{
    id: string;
    order: number;
    dimension_id: DimensionKey;
    option_scores: Record<string, number>; // option_id -> score
  }>;

  levels: LoadedLevel[];
  rules: ScoringRules;

  // Derived lookup structures
  dimension_order: Record<DimensionKey, number>;
  questions_by_id: Record<string, ScoringConfig['questions'][number]>;
  question_ids_by_dimension: Record<DimensionKey, string[]>; // ordered question ids
};

export type ScoreOutput = {
  dimension_scores: Record<DimensionKey, number>;
  dimension_tiers: Record<DimensionKey, Tier>;

  // Base overall (before cap) and final overall (after cap)
  overall_score: number;
  overall_score_capped: number;

  cap_applied: boolean;
  cap_details?: {
    min_dim_score: number;
    cap_additive: number;
    original_overall: number;
    capped_overall: number;
  };

  overall_level: {
    level: 1 | 2 | 3 | 4 | 5;
    key: LevelKey;
    name: string;
    hero_title: string;
    hero_copy: string;
    color_token: string;
  };

  primary_gap: { dimension_id: DimensionKey; score: number };

  critical_gaps: Array<{ dimension_id: DimensionKey; score: number; delta_from_avg: number }>;
  critical_threshold: number;

  cta: { intensity: LeadTier; reason_codes: string[] };
};
