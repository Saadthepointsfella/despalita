-- PHASE 8 HARDENING
-- - Check constraints (scores, tiers, timings)
-- - Additional unique constraints
-- - FK constraints with proper cascades
-- - Updated atomic submit RPC with better error handling

BEGIN;

-- ============================================
-- 1) CHECK CONSTRAINTS
-- ============================================

DO $$
BEGIN
  ALTER TABLE public.options
    ADD CONSTRAINT options_score_between_1_5 CHECK (score >= 1 AND score <= 5);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.quiz_takes
    ADD CONSTRAINT quiz_takes_overall_level_check CHECK (overall_level BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.answers
    ADD CONSTRAINT answers_time_spent_nonnegative CHECK (time_spent_ms IS NULL OR time_spent_ms >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2) FK CONSTRAINTS (best-effort; ignore if already present)
-- ============================================

DO $$
BEGIN
  ALTER TABLE public.answers
    ADD CONSTRAINT answers_question_fk
      FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.answers
    ADD CONSTRAINT answers_option_fk
      FOREIGN KEY (option_id) REFERENCES public.options(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 3) UPDATED ATOMIC SUBMIT RPC (v1)
-- ============================================
-- Input p_answers = jsonb array of objects:
-- { question_id: string, option_id: string, time_spent_ms?: number|null }
-- Idempotency: if submission_hash exists -> return existing token, no new rows.
-- FKs on answers enforce validity; any FK failure rolls back entire function.

CREATE OR REPLACE FUNCTION public.submit_assessment_v1(
  p_token text,
  p_submission_hash text,
  p_email text,
  p_company text,
  p_overall_score numeric,
  p_overall_score_capped numeric,
  p_overall_level int,
  p_dimension_scores jsonb,
  p_dimension_tiers jsonb,
  p_primary_gap text,
  p_critical_gaps jsonb,
  p_critical_threshold numeric,
  p_cta jsonb,
  p_utm jsonb,
  p_answers jsonb
)
RETURNS TABLE(token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_token text;
  v_take_id uuid;
BEGIN
  -- Idempotency check: return existing token if submission_hash matches
  SELECT qt.token INTO v_existing_token
  FROM public.quiz_takes qt
  WHERE qt.submission_hash = p_submission_hash
  LIMIT 1;

  IF v_existing_token IS NOT NULL THEN
    token := v_existing_token;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Insert quiz_take
  INSERT INTO public.quiz_takes (
    token,
    submission_hash,
    email,
    company,
    created_at,
    overall_score,
    overall_score_capped,
    overall_level,
    dimension_scores,
    dimension_tiers,
    primary_gap,
    critical_gaps,
    critical_threshold,
    cta,
    utm
  )
  VALUES (
    p_token,
    p_submission_hash,
    p_email,
    NULLIF(p_company, ''),
    NOW(),
    p_overall_score,
    p_overall_score_capped,
    p_overall_level,
    p_dimension_scores,
    p_dimension_tiers,
    p_primary_gap,
    p_critical_gaps,
    p_critical_threshold,
    p_cta,
    p_utm
  )
  RETURNING id, public.quiz_takes.token INTO v_take_id, token;

  -- Answers insert (FKs enforce validity; any FK failure rolls back entire function)
  INSERT INTO public.answers (quiz_take_id, question_id, option_id, time_spent_ms)
  SELECT
    v_take_id,
    (a->>'question_id')::text,
    (a->>'option_id')::text,
    CASE
      WHEN (a ? 'time_spent_ms') AND (a->>'time_spent_ms') ~ '^\d+$' THEN (a->>'time_spent_ms')::int
      ELSE NULL
    END
  FROM jsonb_array_elements(p_answers) AS a;

  RETURN NEXT;
END $$;

-- Restrict function execution
REVOKE ALL ON FUNCTION public.submit_assessment_v1(
  text,text,text,text,numeric,numeric,int,jsonb,jsonb,text,jsonb,numeric,jsonb,jsonb,jsonb
) FROM PUBLIC;

-- Grant to service_role (bypasses RLS)
GRANT EXECUTE ON FUNCTION public.submit_assessment_v1(
  text,text,text,text,numeric,numeric,int,jsonb,jsonb,text,jsonb,numeric,jsonb,jsonb,jsonb
) TO service_role;

COMMIT;
