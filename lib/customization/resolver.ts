/**
 * PDF Customization Layer - Resolver
 *
 * Pure, deterministic resolver that transforms quiz results into customization data.
 *
 * Given:
 * - ResultsDTO (dimension scores/tiers, gaps, level)
 * - answers[] (question_id, option_id)
 *
 * Returns:
 * - observations_by_question
 * - dependency_flags
 * - impact_blocks
 * - level_benchmarks
 * - tool_recommendations
 *
 * MUST BE:
 * - Pure (no side effects)
 * - Deterministic (same input → same output)
 * - Fast (< 10ms for typical quiz)
 */

import answerObservationsData from '../../config/customization/answer-observations.json';
import dependencyRulesData from '../../config/customization/dependency-rules.json';
import impactEstimatesData from '../../config/customization/impact-estimates.json';
import levelBenchmarksData from '../../config/customization/level-benchmarks.json';
import toolRecommendationsData from '../../config/customization/tool-recommendations.json';

// Types
export interface Answer {
  question_id: string;
  option_id: string;
}

export interface DimensionScore {
  dimension_id: string;
  score: number;
  tier: 'low' | 'medium' | 'high';
  level: number;
}

export interface ResultsDTO {
  overall_level: number;
  dimension_scores: DimensionScore[];
  primary_gap_dimension?: string;
  critical_gap_count?: number;
  foundation_gap_count?: number;
}

export interface ObservationBlock {
  answer_text: string;
  score: number;
  observation_short: string;
  observation_detail: string;
  red_flag: boolean;
}

export interface DependencyFlag {
  id: string;
  priority: number;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  recommendation?: string;
  pdf_section: 'dependency_alert' | 'roadmap_callout';
}

export interface ImpactBlock {
  dimension_id: string;
  tier: 'low' | 'medium' | 'high';
  tier_range: string;
  primary_metric: string;
  metric_value: string;
  metric_label: string;
  headline: string;
  detail: string;
  business_impact: string[];
  cost_example?: string;
  opportunity?: string;
}

export interface LevelBenchmarkBlock {
  dimension_id: string;
  current_level: number;
  current_name: string;
  target_level: number;
  target_name: string;
  current_state: string[];
  target_state: string[];
  gap_summary: string;
  success_indicator: string;
  typical_timeline?: string;
}

export interface ToolRecommendationBlock {
  dimension_id: string;
  tier: 'low' | 'medium' | 'high';
  context: string;
  quick_wins: string[];
  recommended_tools: Array<{
    name: string;
    category: string;
    price: string;
    fit: string;
    url?: string;
    note?: string;
  }>;
  diy_alternative?: string;
}

export interface CustomizationOutput {
  observations_by_question: Record<string, Record<string, ObservationBlock>>;
  dependency_flags: DependencyFlag[];
  impact_blocks: ImpactBlock[];
  level_benchmarks: LevelBenchmarkBlock[];
  tool_recommendations: ToolRecommendationBlock[];
}

/**
 * Resolve answer observations
 */
function resolveObservations(answers: Answer[]): Record<string, Record<string, ObservationBlock>> {
  const result: Record<string, Record<string, ObservationBlock>> = {};

  for (const answer of answers) {
    const { question_id, option_id } = answer;
    const questionData = (answerObservationsData.answer_observations as any)[question_id];

    if (!questionData || !questionData.options[option_id]) {
      continue; // Skip if not found
    }

    if (!result[question_id]) {
      result[question_id] = {};
    }

    result[question_id][option_id] = questionData.options[option_id];
  }

  return result;
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(
  condition: any,
  dimensionScores: Map<string, number>,
  answerMap: Map<string, string>
): boolean {
  // Simple condition: { dimension, operator, value }
  if (condition.dimension && condition.operator && condition.value !== undefined) {
    const score = dimensionScores.get(condition.dimension);
    if (score === undefined) return false;

    switch (condition.operator) {
      case 'lt': return score < condition.value;
      case 'lte': return score <= condition.value;
      case 'gt': return score > condition.value;
      case 'gte': return score >= condition.value;
      case 'eq': return score === condition.value;
      default: return false;
    }
  }

  // Question condition: { question, option_in }
  if (condition.question && condition.option_in) {
    const selectedOption = answerMap.get(condition.question);
    if (!selectedOption) return false;

    // Extract short form (o1, o2, etc.) from full option_id
    const shortOption = selectedOption.split('_').pop();
    return condition.option_in.includes(shortOption);
  }

  // All condition: { all: [...] }
  if (condition.all) {
    return condition.all.every((c: any) => evaluateCondition(c, dimensionScores, answerMap));
  }

  // Any condition: { any: [...] }
  if (condition.any) {
    return condition.any.some((c: any) => evaluateCondition(c, dimensionScores, answerMap));
  }

  return false;
}

/**
 * Interpolate variables in message strings
 */
function interpolateMessage(message: string, dimensionScores: Map<string, number>): string {
  return message.replace(/\{(\w+)_score\}/g, (_, dim) => {
    const score = dimensionScores.get(dim);
    return score !== undefined ? score.toFixed(1) : '?';
  });
}

/**
 * Resolve dependency flags
 */
function resolveDependencyFlags(
  results: ResultsDTO,
  answers: Answer[]
): DependencyFlag[] {
  const flags: DependencyFlag[] = [];

  // Build lookup maps
  const dimensionScores = new Map<string, number>();
  for (const ds of results.dimension_scores) {
    dimensionScores.set(ds.dimension_id, ds.score);
  }

  const answerMap = new Map<string, string>();
  for (const ans of answers) {
    answerMap.set(ans.question_id, ans.option_id);
  }

  // Evaluate each rule
  const rules = (dependencyRulesData.dependency_rules as any).rules || [];
  for (const rule of rules) {
    if (evaluateCondition(rule.condition, dimensionScores, answerMap)) {
      flags.push({
        id: rule.id,
        priority: rule.priority,
        severity: rule.severity,
        title: rule.title,
        message: interpolateMessage(rule.message, dimensionScores),
        recommendation: rule.recommendation,
        pdf_section: rule.pdf_section,
      });
    }
  }

  // Sort by priority
  flags.sort((a, b) => a.priority - b.priority);

  return flags;
}

/**
 * Resolve impact blocks
 */
function resolveImpactBlocks(results: ResultsDTO): ImpactBlock[] {
  const blocks: ImpactBlock[] = [];

  for (const ds of results.dimension_scores) {
    const dimensionData = (impactEstimatesData.impact_estimates as any)[ds.dimension_id];
    if (!dimensionData) continue;

    const tierData = dimensionData[ds.tier];
    if (!tierData) continue;

    blocks.push({
      dimension_id: ds.dimension_id,
      tier: ds.tier,
      ...tierData,
    });
  }

  return blocks;
}

/**
 * Resolve level benchmarks
 */
function resolveLevelBenchmarks(results: ResultsDTO): LevelBenchmarkBlock[] {
  const blocks: LevelBenchmarkBlock[] = [];

  for (const ds of results.dimension_scores) {
    const dimensionData = (levelBenchmarksData.level_benchmarks as any)[ds.dimension_id];
    if (!dimensionData) continue;

    // Find appropriate transition (current_level to target_level)
    const currentLevel = ds.level;
    if (currentLevel >= 5) continue; // Already at max

    const transitionKey = `${currentLevel}_to_${currentLevel + 1}`;
    const transitionData = dimensionData[transitionKey];
    if (!transitionData) continue;

    blocks.push({
      dimension_id: ds.dimension_id,
      ...transitionData,
    });
  }

  return blocks;
}

/**
 * Resolve tool recommendations
 */
function resolveToolRecommendations(results: ResultsDTO): ToolRecommendationBlock[] {
  const blocks: ToolRecommendationBlock[] = [];

  for (const ds of results.dimension_scores) {
    const dimensionData = (toolRecommendationsData.tool_recommendations as any)[ds.dimension_id];
    if (!dimensionData) continue;

    const tierData = dimensionData[ds.tier];
    if (!tierData) continue;

    blocks.push({
      dimension_id: ds.dimension_id,
      tier: ds.tier,
      ...tierData,
    });
  }

  return blocks;
}

/**
 * Main resolver: pure, deterministic function
 */
export function resolveCustomization(
  results: ResultsDTO,
  answers: Answer[]
): CustomizationOutput {
  return {
    observations_by_question: resolveObservations(answers),
    dependency_flags: resolveDependencyFlags(results, answers),
    impact_blocks: resolveImpactBlocks(results),
    level_benchmarks: resolveLevelBenchmarks(results),
    tool_recommendations: resolveToolRecommendations(results),
  };
}

/**
 * Snapshot resolver: for Option A (snapshot at submit-time)
 * Returns serializable JSON snapshot
 */
export function createCustomizationSnapshot(
  results: ResultsDTO,
  answers: Answer[]
): string {
  const output = resolveCustomization(results, answers);
  return JSON.stringify(output, null, 2);
}
