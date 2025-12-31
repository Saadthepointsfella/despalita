import { loadCustomizationData } from './data';
import type {
  BenchmarkBlock,
  CustomizationSnapshot,
  DependencyAlert,
  DependencySeverity,
  ImpactBlock,
  Tier,
  ToolBlock,
} from './types';

type ResultsLike = {
  token: string;
  created_at: string;
  overall: {
    score: number;
    score_capped: number;
    level: { level: number; key: string; name: string; hero_title: string; hero_copy: string; color_token: string };
  };
  dimensions: Array<{
    dimension_id: string;
    order: number;
    section: string;
    short_label: string;
    name: string;
    score: number;
    tier: Tier;
    is_primary_gap: boolean;
    is_critical_gap: boolean;
    delta_from_avg: number;
  }>;
  primary_gap: { dimension_id: string; score: number };
  critical_gaps: Array<{ dimension_id: string; score: number }>;
};

type AnswerRow = { question_id: string; option_id: string };

function clampText(s: unknown, max = 600): string {
  const str = typeof s === 'string' ? s : '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function optionSuffix(optionId: string): string | null {
  const m = optionId.match(/(o[1-5])$/);
  return m ? m[1] : null;
}

function fillTemplate(template: string, vars: Record<string, string | number>): string {
  let out = template;
  const entries = Array.from(Object.entries(vars));
  for (const [k, v] of entries) {
    out = out.replaceAll(`{${k}}`, String(v));
  }
  return out;
}

type RuleCondition =
  | { dimension: string; operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq'; value: number }
  | { question: string; option_in: string[] }
  | { all: RuleCondition[] }
  | { any: RuleCondition[] };

function evalCond(
  cond: RuleCondition,
  ctx: {
    dimScores: Record<string, number>;
    answersByQ: Record<string, string>;
  },
): boolean {
  // dimension condition
  if ((cond as any).dimension) {
    const { dimension, operator, value } = cond as any;
    const score = ctx.dimScores[dimension];
    if (typeof score !== 'number') return false;
    switch (operator) {
      case 'lt': return score < value;
      case 'lte': return score <= value;
      case 'gt': return score > value;
      case 'gte': return score >= value;
      case 'eq': return score === value;
      default: return false;
    }
  }

  // question condition
  if ((cond as any).question) {
    const { question, option_in } = cond as any;
    const picked = ctx.answersByQ[question];
    if (!picked) return false;

    const pickedSuffix = optionSuffix(picked);
    return option_in.some((x: string) => x === picked || (pickedSuffix ? x === pickedSuffix : false));
  }

  // all/any
  if ((cond as any).all) return (cond as any).all.every((c: RuleCondition) => evalCond(c, ctx));
  if ((cond as any).any) return (cond as any).any.some((c: RuleCondition) => evalCond(c, ctx));

  return false;
}

export function resolveCustomization(args: {
  results: ResultsLike;
  answers: AnswerRow[];
  version?: string;
}): CustomizationSnapshot {
  const { results, answers } = args;
  const version = args.version ?? 'v1';

  const data = loadCustomizationData();

  const dimScores: Record<string, number> = {};
  const dimTiers: Record<string, Tier> = {};
  const dimName: Record<string, string> = {};
  for (const d of results.dimensions) {
    dimScores[d.dimension_id] = d.score;
    dimTiers[d.dimension_id] = d.tier;
    dimName[d.dimension_id] = d.name;
  }

  const answersByQ: Record<string, string> = {};
  for (const a of answers) answersByQ[a.question_id] = a.option_id;

  // 1) Answer Observations (only include notable ones)
  const observations: CustomizationSnapshot['observations'] = [];

  const answerObs = data.answer_observations;
  for (const a of answers) {
    const q = answerObs?.[a.question_id];
    if (!q) continue;

    const options = q.options ?? {};
    const direct = options?.[a.option_id];
    const suffix = optionSuffix(a.option_id);
    const fallback = suffix ? options?.[suffix] : null;
    const obs: any = direct ?? fallback;
    if (!obs) continue;

    const score = Number(obs.score ?? 0);
    const red = Boolean(obs.red_flag);

    // Include only "red flags" or low scores (keeps PDF crisp)
    if (!red && score >= 4) continue;

    observations.push({
      question_id: a.question_id,
      option_id: a.option_id,
      score: score || 0,
      observation_short: clampText(obs.observation_short, 120),
      observation_detail: clampText(obs.observation_detail, 500),
      red_flag: red,
    });
  }

  // 2) Dependency Alerts
  const depRules = (data.dependency_rules?.rules ?? []) as Array<any>;
  const dependency_alerts: DependencyAlert[] = [];

  const ctx = { dimScores, answersByQ };
  const sortedRules = [...depRules].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
  for (const r of sortedRules) {
    const cond = r.condition as RuleCondition;
    if (!cond) continue;
    if (!evalCond(cond, ctx)) continue;

    const vars: Record<string, string | number> = {};
    const dimEntries = Array.from(Object.entries(dimScores));
    for (const [k, v] of dimEntries) vars[`${k}_score`] = v;

    dependency_alerts.push({
      id: String(r.id),
      priority: Number(r.priority ?? 999),
      severity: (r.severity as DependencySeverity) ?? 'info',
      title: clampText(r.title, 120),
      message: clampText(fillTemplate(String(r.message ?? ''), vars), 520),
      recommendation: clampText(String(r.recommendation ?? ''), 360),
      blocks: Array.isArray(r.blocks) ? r.blocks.map(String) : undefined,
    });
  }

  // 3) Impact Estimates (top 3 gaps)
  const sortedDims = [...results.dimensions].sort((a, b) => a.score - b.score || a.order - b.order);
  const top3 = sortedDims.slice(0, 3);

  const impactCfg = data.impact_estimates ?? {};
  const impactsOut: ImpactBlock[] = [];
  for (const d of top3) {
    const dim = impactCfg?.[d.dimension_id]?.[d.tier];
    if (!dim) continue;

    impactsOut.push({
      dimension_id: d.dimension_id,
      tier: d.tier,
      headline: clampText(dim.headline, 120),
      metric_value: clampText(dim.metric_value, 40),
      metric_label: clampText(dim.metric_label, 60),
      detail: clampText(dim.detail, 520),
      business_impact: Array.isArray(dim.business_impact) ? dim.business_impact.map((x: any) => clampText(x, 120)) : [],
      cost_example: dim.cost_example ? clampText(dim.cost_example, 240) : undefined,
      opportunity: dim.opportunity ? clampText(dim.opportunity, 240) : undefined,
    });
  }

  // 4) Level Benchmarks (only for top gap dimension, current -> next)
  const bmCfg = data.level_benchmarks ?? {};
  const topGapDim = top3[0];
  const currentLevel = results.overall.level.level;
  const nextLevel = Math.min(5, currentLevel + 1);

  const benchmarksOut: BenchmarkBlock[] = [];
  if (topGapDim && currentLevel < 5) {
    const key = `${currentLevel}_to_${nextLevel}`;
    const bm = bmCfg?.[topGapDim.dimension_id]?.[key];
    if (bm) {
      benchmarksOut.push({
        dimension_id: topGapDim.dimension_id,
        from_level: currentLevel,
        to_level: nextLevel,
        current_state: Array.isArray(bm.current_state) ? bm.current_state.map((x: any) => clampText(x, 120)) : [],
        target_state: Array.isArray(bm.target_state) ? bm.target_state.map((x: any) => clampText(x, 120)) : [],
        gap_summary: clampText(bm.gap_summary, 420),
        success_indicator: clampText(bm.success_indicator, 220),
        typical_timeline: clampText(bm.typical_timeline, 80),
      });
    }
  }

  // 5) Tool Recommendations (top 3 gaps)
  const toolCfg = data.tool_recommendations ?? {};
  const toolsOut: ToolBlock[] = [];
  for (const d of top3) {
    const block = toolCfg?.[d.dimension_id]?.[d.tier];
    if (!block) continue;

    const recTools = Array.isArray(block.recommended_tools) ? block.recommended_tools.slice(0, 6) : [];

    toolsOut.push({
      dimension_id: d.dimension_id,
      tier: d.tier,
      context: clampText(block.context, 280),
      quick_wins: Array.isArray(block.quick_wins) ? block.quick_wins.slice(0, 5).map((x: any) => clampText(x, 120)) : [],
      recommended_tools: recTools.map((t: any) => ({
        name: clampText(t.name, 60),
        category: clampText(t.category, 60),
        price: clampText(t.price, 10),
        fit: clampText(t.fit, 120),
        url: t.url ? clampText(t.url, 200) : undefined,
        note: t.note ? clampText(t.note, 140) : undefined,
      })),
      diy_alternative: block.diy_alternative ? clampText(block.diy_alternative, 240) : undefined,
    });
  }

  return {
    version,
    created_at_iso: new Date().toISOString(),
    observations,
    dependency_alerts,
    impacts: impactsOut,
    benchmarks: benchmarksOut,
    tools: toolsOut,
  };
}
