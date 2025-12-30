// src/types/quiz.ts
// Types aligned with /config JSON schema

export const DIMENSION_KEYS = [
  "tracking",
  "attribution",
  "reporting",
  "experimentation",
  "lifecycle",
  "infrastructure",
] as const;

export type DimensionKey = (typeof DIMENSION_KEYS)[number];

export type Score1to5 = 1 | 2 | 3 | 4 | 5;
export type LevelKey =
  | 'reactive'
  | 'structured'
  | 'systematic'
  | 'integrated'
  | 'compounding';
export type Tier = "low" | "medium" | "high";
export type LeadTier = "hot" | "warm" | "cool";

// Matches config/dimensions.json
export interface Dimension {
  id: DimensionKey;
  order: number;
  section: string;
  short_label: string;
  name: string;
  description: string;
  icon: string;
}

// Matches config/questions.json option
export interface Option {
  id: string;
  label: string;
  score: Score1to5;
}

// Matches config/questions.json question
export interface Question {
  id: string;
  order: number;
  dimension_id: DimensionKey;
  section: string;
  prompt: string;
  options: Option[];
}

// Matches config/roadmap-modules.json
export interface RoadmapModule {
  dimension_id: DimensionKey;
  tier: Tier;
  what_it_means: string;
  now: string[];
  next: string[];
  later: string[];
  success_indicator: string;
}

// Matches config/levels.json
export interface ScoreRange {
  min: number;
  max: number;
  min_inclusive: boolean;
  max_inclusive: boolean;
}

export interface MaturityLevel {
  level: Score1to5;
  key: LevelKey;
  name: string;
  score_range: ScoreRange;
  hero_title: string;
  hero_copy: string;
  cta_tone_default: LeadTier;
  color_token: string;
}

export interface QuizConfig {
  dimensions: Dimension[];
  questions: Question[];
  levels: MaturityLevel[];
}

export type DimensionScores = Record<DimensionKey, number>;

export interface ScoringRules {
  weakestLinkCap: {
    enabled: boolean;
    /** If min dimension score is below this, cap overall score. */
    minDimThreshold: number; // spec: 2.0
    /** overall_score = min(base_avg, min_dim + capDelta) */
    capDelta: number; // spec: 1.5
  };
  criticalGap: {
    /** dimension is critical gap if dim < avg - delta */
    delta: number; // spec: 1.5
  };
}

export interface ScoringOutput {
  dimensionScores: DimensionScores;

  baseOverallScore: number; // avg of 6 dimension scores (before cap)
  overallScore: number; // after weakest-link cap
  minDimension: { key: DimensionKey; score: number };

  primaryGap: { key: DimensionKey; score: number };
  criticalGaps: Array<{ key: DimensionKey; score: number }>;

  level: { level: LevelKey; label: string };
}

export interface CtaIntensity {
  tier: LeadTier;
  reason: string; // short explanation for internal debugging/telemetry
}

export interface QuizAnswerDraft {
  questionId: string;
  optionId: string;
  timeSpentMs?: number;
}
