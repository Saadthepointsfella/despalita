import type {
  AnswerObservationPack,
  BenchmarksPack,
  DependencyRulesPack,
  DimensionKey,
  ImpactPack,
  NextStepsPack,
  Tier,
  ToolRecommendationPack,
} from './types';
import type { ResultsDTO } from '@/lib/results/getResultsForPdf';

export function getAnswerObservation(
  pack: AnswerObservationPack,
  questionId: string,
  optionId: string,
): { summary: string; severity?: 'low' | 'medium' | 'high'; tags?: string[] } | null {
  // Navigate: answer_observations.{question_id}.options.{option_key}
  // Option IDs from DB are like "q01_tracking_setup_o1" but JSON uses "o1"
  const question = pack.answer_observations[questionId];
  if (!question?.options) return null;

  // Try direct lookup first (if JSON uses full IDs)
  let option = question.options[optionId];

  // If not found, extract the "oN" suffix from the option ID
  if (!option && optionId.includes('_o')) {
    const match = optionId.match(/_o(\d+)$/);
    if (match) {
      const shortKey = `o${match[1]}`;
      option = question.options[shortKey];
    }
  }

  if (!option) return null;
  return {
    summary: option.observation_short,
    severity: option.red_flag ? 'high' : undefined,
  };
}

export function getImpact(pack: ImpactPack, dimension: DimensionKey, tier: Tier) {
  const dim = pack.impact_estimates[dimension];
  return dim?.[tier] ?? null;
}

export function getToolRecommendations(pack: ToolRecommendationPack, dimension: DimensionKey, tier: Tier) {
  if (pack.tool_recommendations_patch) {
    const dim = pack.tool_recommendations_patch[dimension as string];
    const tierData = dim?.[tier] ?? dim?.mid;
    const tools = tierData?.recommended_tools;
    if (Array.isArray(tools) && tools.length) {
      return tools.map(t => ({
        name: t.name,
        pricing: t.price ?? '',
        description: t.note ?? t.fit ?? '',
      }));
    }
  }

  // Schema: services_we_dont_do_keep_vendors_as_is
  if (pack.services_we_dont_do_keep_vendors_as_is) {
    const block = pack.services_we_dont_do_keep_vendors_as_is[dimension as string];
    const vendors = block?.vendor_platforms;
    if (Array.isArray(vendors) && vendors.length) {
      return vendors.map((v) => ({
        name: v.name,
        pricing: v.category ?? '',
        description: v.utility ?? v.best_for ?? v.watchouts ?? '',
      }));
    }
  }

  // Legacy schema: tool_recommendations.{dimension}.{tier}.recommended_tools
  if (pack.tool_recommendations) {
    const dim = pack.tool_recommendations[dimension];
    const tierData = dim?.[tier];
    const tools = tierData?.recommended_tools;
    if (!Array.isArray(tools)) return [];
    return tools.map(t => ({
      name: t.name,
      pricing: t.price ?? '',
      description: t.note ?? t.fit ?? '',
    }));
  }

  // Technical competitors schema: technical_competitors.{category}.recommended_tools
  const technical = pack.technical_competitors;
  if (!technical) return [];

  const categoryByDimension: Record<string, string> = {
    tracking: 'tracking_quality_monitoring',
    attribution: 'attribution_mmm_incrementality',
    reporting: 'reporting_bi_layer',
    experimentation: 'experimentation_build_it_yourself',
    lifecycle: 'cdp_identity_event_pipeline',
    infrastructure: 'cdp_identity_event_pipeline',
  };

  const category = categoryByDimension[dimension as string];
  const block = category ? technical[category] : undefined;
  const tools = block?.recommended_tools;
  if (!Array.isArray(tools)) return [];
  return tools.map(t => ({
    name: t.name,
    pricing: t.price ?? '',
    description: t.note ?? t.fit ?? '',
  }));
}

export function getBenchmarkForTransition(
  pack: BenchmarksPack,
  dimension: DimensionKey,
  fromLevel: number,
  toLevel: number,
): { capabilities: string[]; proof_points: string[]; you_know_you_are_there_when: string } | null {
  const key = `${fromLevel}_to_${toLevel}`;
  const bench = pack.level_benchmarks[dimension]?.[key];
  if (!bench) return null;
  // Map JSON fields to expected format
  return {
    capabilities: bench.target_state ?? [],
    proof_points: bench.current_state ?? [],
    you_know_you_are_there_when: bench.success_indicator ?? '',
  };
}

export type DependencyAlert = {
  title: string;
  message: string;
  severity?: 'warn' | 'critical';
};

export function getDependencyAlerts(
  pack: DependencyRulesPack,
  results: ResultsDTO,
): DependencyAlert[] {
  const rules = pack.dependency_rules ?? [];
  if (!Array.isArray(rules) || rules.length === 0) return [];

  const dimensionScores: Record<string, number> = {};
  for (const d of results.dimensions) {
    dimensionScores[d.dimension_id] = d.score;
  }

  const fired: DependencyAlert[] = [];
  for (const r of rules) {
    const source = dimensionScores[r.source_dimension_id];
    const target = dimensionScores[r.target_dimension_id];
    if (typeof source !== 'number' || typeof target !== 'number') continue;
    const okSource = r.source_lte != null ? source <= r.source_lte : true;
    const okTarget = r.target_gte != null ? target >= r.target_gte : true;
    if (okSource && okTarget) {
      fired.push({
        title: r.title,
        message: r.message,
        severity: (r.severity === 'critical' ? 'critical' : 'warn') as 'warn' | 'critical',
      });
    }
  }
  return fired;
}

export function getNextStepsForDimension(
  pack: NextStepsPack,
  dimension: DimensionKey,
  tier: Tier,
) {
  const actions = pack.next_steps_actions[dimension]?.[tier];
  return actions ?? { this_week: [], this_month: [], this_quarter: [] };
}
