// src/lib/config.public.ts
import type { Dimension, Question, MaturityLevel } from '@/types/quiz';

import dimensionsData from '@/config/dimensions.json';
import questionsData from '@/config/questions.json';
import levelsData from '@/config/levels.json';
import tokensData from '@/config/tokens.json';

export const dimensions = dimensionsData.dimensions as Dimension[];
export const questions = questionsData.questions as Question[];
export const levels = levelsData.levels as MaturityLevel[];
export const tokens = tokensData;

// Option B #3: precompiled level matcher (client-safe)
type Range = { min: number; max: number; min_inclusive: boolean; max_inclusive: boolean };

function makeInRange(r: Range) {
  return (x: number) => {
    const aboveMin = r.min_inclusive ? x >= r.min : x > r.min;
    const belowMax = r.max_inclusive ? x <= r.max : x < r.max;
    return aboveMin && belowMax;
  };
}

const LEVEL_MATCHERS = levels.map(l => ({
  level: l,
  test: makeInRange(l.score_range as Range),
}));

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
  return levels[0];
}
