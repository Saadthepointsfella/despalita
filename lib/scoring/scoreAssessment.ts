import type { DimensionKey, Tier } from '@/types/quiz';
import type { ScoreInput, ScoreOutput, ScoringConfig, LoadedLevel } from './types';
import { ScoringError } from './errors';

function roundTo(value: number, decimals: number) {
  const f = Math.pow(10, decimals);
  return Math.round(value * f) / f;
}

function inRange(x: number, r: { min: number; max: number; min_inclusive: boolean; max_inclusive: boolean }) {
  const aboveMin = r.min_inclusive ? x >= r.min : x > r.min;
  const belowMax = r.max_inclusive ? x <= r.max : x < r.max;
  return aboveMin && belowMax;
}

function getLevelByScore(levels: LoadedLevel[], score: number): LoadedLevel {
  for (const l of levels) {
    if (inRange(score, l.score_range)) return l;
  }
  // Defensive fallback (should not happen if ranges cover 1..5)
  return score >= 5 ? levels[levels.length - 1] : levels[0];
}

function getTierByScore(tiers: Array<{ tier: Tier; min: number; max: number; min_inclusive: boolean; max_inclusive: boolean }>, score: number): Tier {
  for (const t of tiers) {
    if (inRange(score, t)) return t.tier;
  }
  return 'low';
}

function compareDimTieBreak(a: { id: DimensionKey; score: number }, b: { id: DimensionKey; score: number }, order: Record<DimensionKey, number>) {
  if (a.score !== b.score) return a.score - b.score;
  return (order[a.id] ?? 999) - (order[b.id] ?? 999);
}

type Facts = Record<string, number | boolean | string>;

function getFact(facts: Facts, name: string) {
  if (name in facts) return facts[name];
  return undefined;
}

function evalCondition(
  factValue: unknown,
  op: 'gte' | 'gt' | 'lte' | 'lt' | 'eq' | 'neq',
  value: number | boolean | string,
) {
  switch (op) {
    case 'gte':
      return typeof factValue === 'number' && factValue >= (value as number);
    case 'gt':
      return typeof factValue === 'number' && factValue > (value as number);
    case 'lte':
      return typeof factValue === 'number' && factValue <= (value as number);
    case 'lt':
      return typeof factValue === 'number' && factValue < (value as number);
    case 'eq':
      return factValue === value;
    case 'neq':
      return factValue !== value;
    default:
      return false;
  }
}

function reasonCodesFromFacts(facts: Facts) {
  const codes: string[] = [];

  const capApplied = facts.cap_applied === true;
  const foundationCount = typeof facts.foundation_gap_count === 'number' ? facts.foundation_gap_count : 0;
  const criticalCount = typeof facts.critical_gap_count === 'number' ? facts.critical_gap_count : 0;
  const level = typeof facts.overall_level === 'number' ? facts.overall_level : undefined;

  if (capApplied) codes.push('CAP_APPLIED');
  if (foundationCount >= 2) codes.push('FOUNDATION_GAPS_2PLUS');
  else if (foundationCount >= 1) codes.push('FOUNDATION_GAPS_1PLUS');

  if (criticalCount >= 2) codes.push('CRITICAL_GAPS_2PLUS');
  else if (criticalCount >= 1) codes.push('CRITICAL_GAPS_1PLUS');

  if (typeof level === 'number' && level <= 2) codes.push('LOW_MATURITY');
  if (typeof level === 'number' && level >= 4) codes.push('HIGH_MATURITY');

  return codes;
}

/**
 * Pure scoring function: config-driven, deterministic, no DB calls.
 */
export function scoreAssessment(config: ScoringConfig, input: ScoreInput): ScoreOutput {
  const decimals = config.rules.rounding.score_decimal_places;

  // Build answer score map: question_id -> score
  const answerScore: Record<string, number> = {};
  for (const a of input.answers) {
    const q = config.questions_by_id[a.question_id];
    if (!q) throw new ScoringError('INVALID_INPUT', `Unknown question_id: ${a.question_id}.`);
    const score = q.option_scores[a.option_id];
    if (typeof score !== 'number') {
      throw new ScoringError('INVALID_INPUT', `Option ${a.option_id} does not belong to question ${a.question_id}.`);
    }
    answerScore[a.question_id] = score;
  }

  // Dimension scores (raw float for logic)
  const dimScoresRaw: Array<{ id: DimensionKey; score: number }> = [];
  const dimTiers: Record<DimensionKey, Tier> = {} as any;

  for (const dim of config.dimensions) {
    const qids = config.question_ids_by_dimension[dim.id];
    if (!qids || qids.length !== 4) {
      throw new ScoringError('CONFIG_INVALID', `Dimension ${dim.id} missing question mapping.`);
    }

    const scores = qids.map((qid) => answerScore[qid]).filter((x) => typeof x === 'number');
    if (scores.length !== 4) {
      throw new ScoringError('INVALID_INPUT', `Incomplete answers for dimension ${dim.id}.`);
    }

    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    dimScoresRaw.push({ id: dim.id, score: avg });
    dimTiers[dim.id] = getTierByScore(config.rules.tier_thresholds.tiers, avg);
  }

  const baseOverallRaw = dimScoresRaw.reduce((s, d) => s + d.score, 0) / dimScoresRaw.length;

  // Weakest-link cap
  const minDim = dimScoresRaw.reduce((min, d) => (compareDimTieBreak(d, min, config.dimension_order) < 0 ? d : min));
  const weakest = config.rules.overall_scoring.weakest_link;
  let capApplied = false;
  let cappedOverallRaw = baseOverallRaw;
  let capDetails: ScoreOutput['cap_details'] | undefined;

  if (weakest.enabled && minDim.score < weakest.trigger_min_dim_lt) {
    const capAdd = weakest.cap_delta;
    cappedOverallRaw = Math.min(baseOverallRaw, minDim.score + capAdd);
    capApplied = cappedOverallRaw < baseOverallRaw;
    capDetails = {
      min_dim_score: roundTo(minDim.score, decimals),
      cap_additive: capAdd,
      original_overall: roundTo(baseOverallRaw, decimals),
      capped_overall: roundTo(cappedOverallRaw, decimals),
    };
  }

  // Level mapping uses capped overall (authoritative overall)
  const overallForLevel = cappedOverallRaw;
  const level = getLevelByScore(config.levels, overallForLevel);

  // Gaps
  const primaryGap = minDim;

  const criticalDelta = config.rules.gaps.critical_gap.delta;
  const criticalThresholdRaw = baseOverallRaw - criticalDelta;
  const criticalGapsRaw = dimScoresRaw
    .filter((d) => d.score < criticalThresholdRaw)
    .sort((a, b) => compareDimTieBreak(a, b, config.dimension_order))
    .map((d) => ({
      dimension_id: d.id,
      score: d.score,
      delta_from_avg: baseOverallRaw - d.score,
    }));

  const foundationThreshold = config.rules.gaps.foundation_gap.threshold;
  const foundationCount = dimScoresRaw.filter((d) => d.score < foundationThreshold).length;

  // CTA rules: config-driven condition evaluation
  const facts: Facts = {
    foundation_gap_count: foundationCount,
    critical_gap_count: criticalGapsRaw.length,
    cap_applied: capApplied,
    min_dim_score: minDim.score,
    overall_level: level.level,
    overall_score_capped: roundTo(cappedOverallRaw, decimals),
  };

  let selectedRuleId: string | null = null;
  let intensity: 'hot' | 'warm' | 'cool' = 'cool';

  const sortedRules = [...config.rules.cta_rules].sort((a, b) => a.priority - b.priority);
  for (const rule of sortedRules) {
    let ok = true;
    for (const cond of rule.when) {
      const fv = getFact(facts, cond.fact);
      ok = ok && evalCondition(fv, cond.op, cond.value);
      if (!ok) break;
    }
    if (ok) {
      intensity = rule.then.cta_tone;
      selectedRuleId = rule.id;
      break;
    }
  }

  const reasonCodes = reasonCodesFromFacts(facts);
  if (selectedRuleId) reasonCodes.push(`CTA_RULE:${selectedRuleId}`);

  // Output rounding: stable and predictable. Logic used raw floats.
  const dimension_scores: Record<DimensionKey, number> = {} as any;
  for (const d of dimScoresRaw) dimension_scores[d.id] = roundTo(d.score, decimals);

  return {
    dimension_scores,
    dimension_tiers: dimTiers,
    overall_score: roundTo(baseOverallRaw, decimals),
    overall_score_capped: roundTo(cappedOverallRaw, decimals),
    cap_applied: capApplied,
    cap_details: capDetails,
    overall_level: {
      level: level.level,
      key: level.key,
      name: level.name,
      hero_title: level.hero_title,
      hero_copy: level.hero_copy,
      color_token: level.color_token,
    },
    primary_gap: { dimension_id: primaryGap.id, score: roundTo(primaryGap.score, decimals) },
    critical_gaps: criticalGapsRaw.map((g) => ({
      dimension_id: g.dimension_id,
      score: roundTo(g.score, decimals),
      delta_from_avg: roundTo(g.delta_from_avg, decimals),
    })),
    critical_threshold: roundTo(criticalThresholdRaw, decimals),
    cta: { intensity, reason_codes: reasonCodes },
  };
}
