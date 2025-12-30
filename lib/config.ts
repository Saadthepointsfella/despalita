// src/lib/config.ts
import 'server-only';

import type { Dimension, Question, MaturityLevel, RoadmapModule } from '@/types/quiz';

import dimensionsData from '@/config/dimensions.json';
import questionsData from '@/config/questions.json';
import levelsData from '@/config/levels.json';
import scoringRulesData from '@/config/scoring-rules.json';
import roadmapModulesData from '@/config/roadmap-modules.json';
import tokensData from '@/config/tokens.json';

// --- Runtime schema validation (Option B #2) ---
import Ajv2020 from 'ajv/dist/2020';

import tokensSchema from '@/config/schemas/tokens.schema.json';
import dimensionsSchema from '@/config/schemas/dimensions.schema.json';
import questionsSchema from '@/config/schemas/questions.schema.json';
import levelsSchema from '@/config/schemas/levels.schema.json';
import scoringRulesSchema from '@/config/schemas/scoring-rules.schema.json';
import roadmapModulesSchema from '@/config/schemas/roadmap-modules.schema.json';

type Json = Record<string, unknown>;

function validateConfigBundle() {
  const ajv = new Ajv2020({ allErrors: true, strict: true });

  const validators = [
    { name: 'tokens.json', schema: tokensSchema as Json, data: tokensData as unknown },
    { name: 'dimensions.json', schema: dimensionsSchema as Json, data: dimensionsData as unknown },
    { name: 'questions.json', schema: questionsSchema as Json, data: questionsData as unknown },
    { name: 'levels.json', schema: levelsSchema as Json, data: levelsData as unknown },
    { name: 'scoring-rules.json', schema: scoringRulesSchema as Json, data: scoringRulesData as unknown },
    { name: 'roadmap-modules.json', schema: roadmapModulesSchema as Json, data: roadmapModulesData as unknown },
  ];

  for (const v of validators) {
    const validate = ajv.compile(v.schema);
    const ok = validate(v.data);
    if (!ok) {
      const details = JSON.stringify(validate.errors, null, 2);
      throw new Error(`[config] Schema validation failed for ${v.name}\n${details}`);
    }
  }
}

// Runs once at server startup / cold start
validateConfigBundle();

// Typed exports
export const dimensions = dimensionsData.dimensions as Dimension[];
export const questions = questionsData.questions as Question[];
export const levels = levelsData.levels as MaturityLevel[];
export const scoringRules = scoringRulesData;
export const roadmapModules = roadmapModulesData.modules as RoadmapModule[];
export const tokens = tokensData;

// ---- Option B #3: precompiled range matchers (shared helper) ----
type Range = { min: number; max: number; min_inclusive: boolean; max_inclusive: boolean };

function makeInRange(r: Range) {
  return (x: number) => {
    const aboveMin = r.min_inclusive ? x >= r.min : x > r.min;
    const belowMax = r.max_inclusive ? x <= r.max : x < r.max;
    return aboveMin && belowMax;
  };
}

// Precompile level matchers once
const LEVEL_MATCHERS = levels.map(l => ({
  level: l,
  test: makeInRange(l.score_range as Range),
}));

// Precompile tier matchers once
const TIER_MATCHERS = (scoringRules.tier_thresholds.tiers as Array<{
  tier: 'low' | 'medium' | 'high';
} & Range>).map(t => ({
  tier: t.tier,
  test: makeInRange(t),
}));

// Helper functions
export function getDimensionById(id: string): Dimension | undefined {
  return dimensions.find(d => d.id === id);
}

export function getQuestionsByDimension(dimensionId: string): Question[] {
  return questions.filter(q => q.dimension_id === dimensionId);
}

export function getQuestionById(questionId: string): Question | undefined {
  return questions.find(q => q.id === questionId);
}

export function getLevelByScore(score: number): MaturityLevel {
  for (const m of LEVEL_MATCHERS) {
    if (m.test(score)) return m.level;
  }
  return levels[0]; // deterministic fallback
}

export function getTierByDimensionScore(score: number): 'low' | 'medium' | 'high' {
  for (const m of TIER_MATCHERS) {
    if (m.test(score)) return m.tier;
  }
  return 'low';
}

export function getRoadmapForDimension(
  dimensionId: string,
  tier: 'low' | 'medium' | 'high'
): RoadmapModule | undefined {
  return roadmapModules.find(m => m.dimension_id === dimensionId && m.tier === tier);
}
