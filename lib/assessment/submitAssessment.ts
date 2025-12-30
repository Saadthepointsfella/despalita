import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { generateResultToken } from '@/lib/tokens';
import { computeSubmissionHash } from '@/lib/submission-hash';
import { calculateScores } from '@/lib/scoring';
import type { SubmitRequest } from './submit-schema';
import { normalizeSubmitRequest } from './submit-schema';
import type { QuizAnswerDraft } from '@/types/quiz';

export async function submitAssessment(raw: SubmitRequest): Promise<{ token: string }> {
  const { email, company, answers, timingMap, utm, honeypot } = normalizeSubmitRequest(raw);

  if (honeypot) {
    throw new Error('Honeypot triggered.');
  }

  // Convert answers to the format expected by calculateScores
  const quizAnswers: QuizAnswerDraft[] = answers.map((a) => ({
    questionId: a.question_id,
    optionId: a.option_id,
    timeSpentMs: timingMap[a.question_id] ?? 0,
  }));

  // Score on server (authoritative)
  const scoreOutput = calculateScores(quizAnswers);

  const submission_hash = computeSubmissionHash({ email, answers });

  const supabase = createSupabaseAdminClient();

  // Prepare answer rows with timing
  const answersForDb = answers.map((a) => ({
    question_id: a.question_id,
    option_id: a.option_id,
    time_spent_ms: timingMap[a.question_id] ?? null,
  }));

  // Build dimension_scores and dimension_tiers records
  const dimension_scores: Record<string, number> = {};
  const dimension_tiers: Record<string, string> = {};
  for (const ds of scoreOutput.dimension_scores) {
    dimension_scores[ds.dimension_id] = ds.score;
    dimension_tiers[ds.dimension_id] = ds.tier;
  }

  // Calculate critical threshold
  const criticalThreshold = scoreOutput.base_overall_score - 1.5;

  // Token collision retry (extremely rare)
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = generateResultToken();

    // Try v1 RPC first (Phase 8), fall back to original
    const rpcResult = await trySubmitV1(supabase, {
      token,
      submission_hash,
      email,
      company: company ?? '',
      overall_score: scoreOutput.base_overall_score,
      overall_score_capped: scoreOutput.overall_score,
      overall_level: scoreOutput.level,
      dimension_scores,
      dimension_tiers,
      primary_gap: scoreOutput.gaps.primary_gap,
      critical_gaps: scoreOutput.gaps.critical_gaps.map((d) => ({
        dimension_id: d,
        score: dimension_scores[d] ?? 0,
      })),
      critical_threshold: criticalThreshold,
      cta: { intensity: scoreOutput.cta_tone, reason_codes: [scoreOutput.cta_reason] },
      utm: utm ?? {},
      answers: answersForDb,
    });

    if (rpcResult.success) {
      return { token: rpcResult.token };
    }

    // 23505 unique_violation (token collision or submission hash race)
    if (rpcResult.code === '23505' && attempt < 2) continue;

    throw new Error('DB_ERROR');
  }

  throw new Error('DB_ERROR');
}

type SubmitParams = {
  token: string;
  submission_hash: string;
  email: string;
  company: string;
  overall_score: number;
  overall_score_capped: number;
  overall_level: number;
  dimension_scores: Record<string, number>;
  dimension_tiers: Record<string, string>;
  primary_gap: string;
  critical_gaps: Array<{ dimension_id: string; score: number }>;
  critical_threshold: number;
  cta: { intensity: string; reason_codes: string[] };
  utm: Record<string, string>;
  answers: Array<{ question_id: string; option_id: string; time_spent_ms: number | null }>;
};

async function trySubmitV1(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  params: SubmitParams
): Promise<{ success: true; token: string } | { success: false; code?: string }> {
  // Try v1 RPC first (returns TABLE)
  console.log('[DEBUG] Calling submit_assessment_v1...');
  const { data: v1Data, error: v1Error } = await supabase.rpc('submit_assessment_v1', {
    p_token: params.token,
    p_submission_hash: params.submission_hash,
    p_email: params.email,
    p_company: params.company,
    p_overall_score: params.overall_score,
    p_overall_score_capped: params.overall_score_capped,
    p_overall_level: params.overall_level,
    p_dimension_scores: params.dimension_scores,
    p_dimension_tiers: params.dimension_tiers,
    p_primary_gap: params.primary_gap,
    p_critical_gaps: params.critical_gaps,
    p_critical_threshold: params.critical_threshold,
    p_cta: params.cta,
    p_utm: params.utm,
    p_answers: params.answers,
  });

  console.log('[DEBUG] v1 result:', { v1Data, v1Error });

  if (!v1Error && Array.isArray(v1Data) && v1Data[0]?.token) {
    return { success: true, token: v1Data[0].token };
  }

  // Fall back to original RPC if v1 doesn't exist
  // PGRST202 = PostgREST function not found, 42883 = PostgreSQL function not found
  if (v1Error?.code === '42883' || v1Error?.code === 'PGRST202') {
    console.log('[DEBUG] v1 not found, falling back to original RPC...');
    // Function not found, use original
    const { data, error } = await supabase.rpc('submit_assessment', {
      p_token: params.token,
      p_submission_hash: params.submission_hash,
      p_email: params.email,
      p_company: params.company || null,
      p_overall_score: params.overall_score,
      p_overall_score_capped: params.overall_score_capped,
      p_overall_level: params.overall_level,
      p_dimension_scores: params.dimension_scores,
      p_dimension_tiers: params.dimension_tiers,
      p_primary_gap: params.primary_gap,
      p_critical_gaps: params.critical_gaps,
      p_critical_threshold: params.critical_threshold,
      p_cta: params.cta,
      p_utm: params.utm,
      p_answers: params.answers,
    });

    if (!error) {
      const returnedToken = (data as { token?: string })?.token;
      return { success: true, token: returnedToken ?? params.token };
    }

    return { success: false, code: (error as { code?: string })?.code };
  }

  return { success: false, code: (v1Error as { code?: string })?.code };
}
