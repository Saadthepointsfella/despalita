import 'server-only';
import { pdfPacks, optionKeyFallback } from '@/lib/pdf/packs';
import type { PdfData } from '@/lib/results/getResultsForPdf';
import type { Tier } from '@/types/quiz';

export type EnrichedDimension = {
  dimension_id: string;
  name: string;
  short_label: string;
  section: string;
  score: number;
  tier: Tier;
  observations: Array<{ short: string; detail: string; red_flag?: boolean; q?: string }>;
  benchmark?: {
    title: string;
    gap_summary: string;
    success_indicator: string;
    typical_timeline?: string;
    target_state: string[];
  };
  tools?: {
    context?: string;
    quick_wins?: string[];
    recommended_tools?: Array<{ name: string; category: string; price: string; fit: string; note?: string; url?: string }>;
    diy_alternative?: string;
  };
  impact?: {
    headline?: string;
    detail?: string;
    business_impact?: string[];
    cost_example?: string;
    opportunity?: string;
  };
};

export type DependencyAlert = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  recommendation: string;
};

function clampList<T>(arr: T[] | undefined | null, max: number) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, max);
}

function fmtTemplate(str: string, vars: Record<string, string>) {
  return str.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

function evalCondition(
  cond: any,
  ctx: { dimScores: Record<string, number>; answers: Record<string, string> }
): boolean {
  if (!cond) return true;

  if (cond.all && Array.isArray(cond.all)) {
    return cond.all.every((c: any) => evalCondition(c, ctx));
  }

  if (cond.any && Array.isArray(cond.any)) {
    return cond.any.some((c: any) => evalCondition(c, ctx));
  }

  if (cond.dimension) {
    const v = ctx.dimScores[cond.dimension];
    if (typeof v !== 'number') return false;
    switch (cond.operator) {
      case 'lt':
        return v < cond.value;
      case 'lte':
        return v <= cond.value;
      case 'gt':
        return v > cond.value;
      case 'gte':
        return v >= cond.value;
      case 'eq':
        return v === cond.value;
      default:
        return false;
    }
  }

  if (cond.question) {
    const opt = ctx.answers[cond.question];
    if (!opt) return false;
    const fb = optionKeyFallback(opt);
    const set = new Set((cond.option_in ?? []).map((x: string) => x.toLowerCase()));
    return (fb && set.has(fb)) || set.has(opt.toLowerCase());
  }

  return false;
}

export function buildPdfEnrichment(data: PdfData) {
  const { results, answers } = data;

  const dimScores: Record<string, number> = {};
  const dimTiers: Record<string, Tier> = {};
  const dimMeta: Record<string, { name: string; section: string }> = {};

  for (const d of results.dimensions) {
    dimScores[d.dimension_id] = d.score;
    dimTiers[d.dimension_id] = d.tier;
    dimMeta[d.dimension_id] = { name: d.name, section: d.section };
  }

  // answers map for dependency rules + observations
  const answersMap: Record<string, string> = {};
  for (const a of answers) answersMap[a.question_id] = a.option_id;

  // Observations per dimension: pick strongest signals (red flags first, then lowest scores)
  const obsPack: any = (pdfPacks.answerObs as any).answer_observations ?? pdfPacks.answerObs;
  const observationsByDim: Record<string, EnrichedDimension['observations']> = {};

  for (const a of answers) {
    const qNode = obsPack?.[a.question_id];
    if (!qNode) continue;
    const optNode = qNode.options?.[a.option_id] ?? (optionKeyFallback(a.option_id) ? qNode.options?.[optionKeyFallback(a.option_id)!] : null);
    if (!optNode) continue;

    const dim = String(qNode.dimension);
    observationsByDim[dim] ||= [];
    const order = answers.find((x) => x.question_id === a.question_id)?.question_order ?? 0;
    observationsByDim[dim].push({
      short: String(optNode.observation_short ?? ''),
      detail: String(optNode.observation_detail ?? ''),
      red_flag: Boolean(optNode.red_flag),
      q: order ? `Q${order}` : undefined,
    });
  }

  // Benchmarks: show "next transition" from overall level
  const overallLevel = results.overall.level.level;
  const nextLevel = Math.min(5, overallLevel + 1);
  const transitionKey = `${overallLevel}_to_${nextLevel}` as const;

  const benchPack: any = (pdfPacks.levelBench as any).level_benchmarks ?? pdfPacks.levelBench;
  const toolsPack: any = (pdfPacks.toolRecs as any).tool_recommendations ?? pdfPacks.toolRecs;
  const impactPack: any = (pdfPacks.impactEst as any).impact_estimates ?? pdfPacks.impactEst;
  const depPack: any = (pdfPacks.dependencyRules as any).dependency_rules ?? pdfPacks.dependencyRules;

  const enrichedDims: EnrichedDimension[] = results.dimensions.map((d) => {
    const dimId = d.dimension_id;
    const dimName = d.name;

    const obs = observationsByDim[dimId] ?? [];
    const sortedObs = [...obs].sort((a, b) => Number(Boolean(b.red_flag)) - Number(Boolean(a.red_flag)));
    const pickedObs = clampList(sortedObs, 3).filter((x) => x.short && x.detail);

    const bench = benchPack?.[dimId]?.[transitionKey]
      ? {
          title: `What Level ${nextLevel} looks like in ${dimName}`,
          gap_summary: String(benchPack[dimId][transitionKey].gap_summary ?? ''),
          success_indicator: String(benchPack[dimId][transitionKey].success_indicator ?? ''),
          typical_timeline: String(benchPack[dimId][transitionKey].typical_timeline ?? ''),
          target_state: clampList<string>(benchPack[dimId][transitionKey].target_state, 6),
        }
      : undefined;

    const tools = toolsPack?.[dimId]?.[d.tier]
      ? {
          context: String(toolsPack[dimId][d.tier].context ?? ''),
          quick_wins: clampList<string>(toolsPack[dimId][d.tier].quick_wins, 5),
          recommended_tools: clampList<any>(toolsPack[dimId][d.tier].recommended_tools, 6),
          diy_alternative: String(toolsPack[dimId][d.tier].diy_alternative ?? ''),
        }
      : undefined;

    const impact = impactPack?.[dimId]?.[d.tier]
      ? {
          headline: String(impactPack[dimId][d.tier].headline ?? ''),
          detail: String(impactPack[dimId][d.tier].detail ?? ''),
          business_impact: clampList<string>(impactPack[dimId][d.tier].business_impact, 6),
          cost_example: String(impactPack[dimId][d.tier].cost_example ?? ''),
          opportunity: String(impactPack[dimId][d.tier].opportunity ?? ''),
        }
      : undefined;

    return {
      dimension_id: dimId,
      name: dimName,
      short_label: d.short_label,
      section: d.section,
      score: d.score,
      tier: d.tier,
      observations: pickedObs,
      benchmark: bench,
      tools,
      impact,
    };
  });

  // Dependency alerts
  const rules = Array.isArray(depPack?.rules) ? depPack.rules : [];
  const ctx = { dimScores, answers: answersMap };

  const alerts: DependencyAlert[] = rules
    .filter((r: any) => evalCondition(r.condition, ctx))
    .sort((a: any, b: any) => Number(a.priority ?? 999) - Number(b.priority ?? 999))
    .slice(0, 4)
    .map((r: any) => {
      const vars: Record<string, string> = {};
      const entries = Array.from(Object.entries(dimScores));
      for (const [k, v] of entries) vars[`${k}_score`] = String(v.toFixed(1));
      return {
        id: String(r.id),
        severity: (r.severity ?? 'info') as any,
        title: String(r.title ?? ''),
        message: fmtTemplate(String(r.message ?? ''), vars),
        recommendation: String(r.recommendation ?? ''),
      };
    });

  return { enrichedDims, alerts, nextLevel };
}
