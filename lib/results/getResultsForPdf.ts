import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { dimensions, levels, scoringRules } from '@/lib/config';
import type { Tier, LeadTier } from '@/types/quiz';

export type ResultsDTO = {
  token: string;
  created_at: string;
  overall: {
    score: number;
    score_capped: number;
    level: {
      level: 1 | 2 | 3 | 4 | 5;
      key: string;
      name: string;
      hero_title: string;
      hero_copy: string;
      color_token: string;
    };
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
  roadmap: Array<{
    dimension_id: string;
    tier: Tier;
    what_it_means: string;
    now: string[];
    next: string[];
    later: string[];
    success_indicator: string;
  }>;
  cta: { intensity: LeadTier; reason_codes: string[] };
};

export type PdfData = {
  results: ResultsDTO;
  company: string | null;
  answers: Array<{ question_id: string; option_id: string; score: number; question_order: number; dimension_id: string }>;
};

type QuizTakeRow = {
  id: string;
  token: string;
  created_at: string;
  email: string;
  company: string | null;
  overall_score: number;
  overall_score_capped: number | null;
  overall_level: number;
  dimension_scores: Record<string, number>;
  dimension_tiers: Record<string, Tier> | null;
  primary_gap: string | null;
  critical_gaps: Array<{ dimension_id: string; score: number }> | string[] | null;
  critical_threshold: number | null;
  cta: { intensity: LeadTier; reason_codes: string[] } | null;
};

export async function getResultsForPdf(token: string): Promise<PdfData | null> {
  const supabase = createSupabaseAdminClient();

  // 1) Fetch quiz_takes with id for answers join
  const { data: takeData, error: tErr } = await supabase
    .from('quiz_takes')
    .select(
      'id, token, created_at, email, company, overall_score, overall_score_capped, overall_level, dimension_scores, dimension_tiers, primary_gap, critical_gaps, critical_threshold, cta',
    )
    .eq('token', token)
    .maybeSingle();

  if (tErr || !takeData) return null;

  const take = takeData as QuizTakeRow;

  // 2) Fetch answers with separate queries for options and questions (no FK relationships)
  const { data: answersData } = await supabase
    .from('answers')
    .select('question_id, option_id')
    .eq('quiz_take_id', take.id);

  const answers: PdfData['answers'] = [];
  if (answersData && answersData.length > 0) {
    // Fetch option scores
    const optionIds = answersData.map((a) => a.option_id);
    const { data: optionsData } = await supabase
      .from('options')
      .select('id, score')
      .in('id', optionIds);

    const optionScores = new Map<string, number>();
    if (optionsData) {
      for (const opt of optionsData) {
        optionScores.set(opt.id, opt.score ?? 0);
      }
    }

    // Fetch question orders and dimension_id
    const questionIds = answersData.map((a) => a.question_id);
    const { data: questionsData } = await supabase
      .from('questions')
      .select('id, order, dimension_id')
      .in('id', questionIds);

    const questionOrders = new Map<string, number>();
    const questionDimensions = new Map<string, string>();
    if (questionsData) {
      for (const q of questionsData) {
        questionOrders.set(q.id, q.order ?? 0);
        questionDimensions.set(q.id, q.dimension_id ?? '');
      }
    }

    for (const a of answersData) {
      answers.push({
        question_id: a.question_id,
        option_id: a.option_id,
        score: optionScores.get(a.option_id) ?? 0,
        question_order: questionOrders.get(a.question_id) ?? 0,
        dimension_id: questionDimensions.get(a.question_id) ?? '',
      });
    }
  }

  // 3) Load config-derived level object
  const lvl = levels.find((l) => l.level === take.overall_level);
  const safeLevel = lvl ?? levels[0];

  const dims = [...dimensions].slice().sort((a, b) => a.order - b.order);

  const dimScores = take.dimension_scores ?? {};
  const dimTiers = take.dimension_tiers ?? {};

  const overallAvg = take.overall_score;
  const criticalThreshold = typeof take.critical_threshold === 'number' ? take.critical_threshold : overallAvg - scoringRules.gaps.critical_gap.delta;

  const primaryGapId = take.primary_gap ?? dims.reduce((min, d) => (dimScores[d.id] ?? 5) < (dimScores[min.id] ?? 5) ? d : min, dims[0]).id;

  const criticalSet = new Set<string>();
  const criticalGapsStored = take.critical_gaps ?? [];
  if (Array.isArray(criticalGapsStored)) {
    for (const g of criticalGapsStored as any[]) {
      if (typeof g === 'string') criticalSet.add(g);
      else if (g && typeof g.dimension_id === 'string') criticalSet.add(g.dimension_id);
    }
  }

  const dimensionsResult = dims.map((d) => {
    const score = dimScores[d.id] ?? 1;
    const tier = (dimTiers[d.id] ?? 'low') as Tier;
    return {
      dimension_id: d.id,
      order: d.order,
      section: d.section,
      short_label: d.short_label,
      name: d.name,
      score,
      tier,
      is_primary_gap: d.id === primaryGapId,
      is_critical_gap: score < criticalThreshold || criticalSet.has(d.id),
      delta_from_avg: +(overallAvg - score).toFixed(2),
    };
  });

  // 4) Determine top 3 gaps (lowest scores)
  const top3 = [...dimensionsResult].sort((a, b) => a.score - b.score || a.order - b.order).slice(0, 3);

  // 5) Load roadmap modules for those dims using stored tiers
  const roadmap: ResultsDTO['roadmap'] = [];
  for (const d of top3) {
    const { data: mod } = await supabase
      .from('roadmap_modules')
      .select('dimension_id, tier, what_it_means, now, next, later, success_indicator')
      .eq('dimension_id', d.dimension_id)
      .eq('tier', d.tier)
      .maybeSingle();

    if (mod) {
      roadmap.push({
        dimension_id: mod.dimension_id,
        tier: mod.tier as Tier,
        what_it_means: mod.what_it_means,
        now: Array.isArray(mod.now) ? mod.now : (mod.now ?? []),
        next: Array.isArray(mod.next) ? mod.next : (mod.next ?? []),
        later: Array.isArray(mod.later) ? mod.later : (mod.later ?? []),
        success_indicator: mod.success_indicator,
      });
    }
  }

  const criticalGaps = dimensionsResult
    .filter((d) => d.is_critical_gap)
    .map((d) => ({ dimension_id: d.dimension_id, score: d.score }));

  const primary_gap = { dimension_id: primaryGapId, score: dimScores[primaryGapId] ?? 1 };

  const cta = take.cta ?? { intensity: 'cool' as LeadTier, reason_codes: ['CTA_MISSING_DEFAULT'] };

  const results: ResultsDTO = {
    token: take.token,
    created_at: take.created_at,
    overall: {
      score: take.overall_score,
      score_capped: take.overall_score_capped ?? take.overall_score,
      level: {
        level: safeLevel.level as 1 | 2 | 3 | 4 | 5,
        key: safeLevel.key,
        name: safeLevel.name,
        hero_title: safeLevel.hero_title,
        hero_copy: safeLevel.hero_copy,
        color_token: safeLevel.color_token,
      },
    },
    dimensions: dimensionsResult,
    primary_gap,
    critical_gaps: criticalGaps,
    roadmap,
    cta,
  };

  return {
    results,
    company: take.company,
    answers,
  };
}
