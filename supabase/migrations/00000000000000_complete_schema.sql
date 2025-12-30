-- MaxMin DTC Assessment - Complete Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- This combines all phases into one migration

BEGIN;

-- ============================================
-- PHASE 1: Base Tables
-- ============================================

-- Dimensions table
CREATE TABLE IF NOT EXISTS public.dimensions (
  id TEXT PRIMARY KEY,
  "order" INTEGER NOT NULL,
  section TEXT NOT NULL,
  short_label TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  weight NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions table
CREATE TABLE IF NOT EXISTS public.questions (
  id TEXT PRIMARY KEY,
  "order" INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  dimension_id TEXT NOT NULL REFERENCES public.dimensions(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Options table
CREATE TABLE IF NOT EXISTS public.options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES public.questions(id),
  "order" INTEGER NOT NULL,
  label TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- App settings table (for levels config, scoring rules)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roadmap modules table
CREATE TABLE IF NOT EXISTS public.roadmap_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_id TEXT NOT NULL REFERENCES public.dimensions(id),
  tier TEXT NOT NULL CHECK (tier IN ('low', 'medium', 'high')),
  what_it_means TEXT NOT NULL,
  now JSONB DEFAULT '[]'::jsonb,
  next JSONB DEFAULT '[]'::jsonb,
  later JSONB DEFAULT '[]'::jsonb,
  success_indicator TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dimension_id, tier)
);

-- ============================================
-- PHASE 4: Quiz Takes + Answers
-- ============================================

-- Quiz takes table (main submission record)
CREATE TABLE IF NOT EXISTS public.quiz_takes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  submission_hash TEXT,
  email TEXT NOT NULL,
  company TEXT,
  overall_score NUMERIC,
  overall_score_capped NUMERIC,
  overall_level INTEGER,
  dimension_scores JSONB,
  dimension_tiers JSONB,
  primary_gap TEXT,
  critical_gaps JSONB,
  critical_threshold NUMERIC,
  cta JSONB,
  utm JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Answers table (individual answers per take)
CREATE TABLE IF NOT EXISTS public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_take_id UUID NOT NULL REFERENCES public.quiz_takes(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  option_id TEXT NOT NULL,
  time_spent_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_questions_dimension ON public.questions(dimension_id);
CREATE INDEX IF NOT EXISTS idx_options_question ON public.options(question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_takes_token ON public.quiz_takes(token);
CREATE INDEX IF NOT EXISTS idx_quiz_takes_email ON public.quiz_takes(email);
CREATE UNIQUE INDEX IF NOT EXISTS quiz_takes_submission_hash_key ON public.quiz_takes(submission_hash);
CREATE INDEX IF NOT EXISTS quiz_takes_created_at_idx ON public.quiz_takes(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS answers_unique_question_per_take ON public.answers(quiz_take_id, question_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_modules_dimension ON public.roadmap_modules(dimension_id);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE public.dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_takes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Allow anonymous read dimensions" ON public.dimensions;
DROP POLICY IF EXISTS "Allow anonymous read questions" ON public.questions;
DROP POLICY IF EXISTS "Allow anonymous read options" ON public.options;
DROP POLICY IF EXISTS "Allow anonymous read app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Allow anonymous read roadmap_modules" ON public.roadmap_modules;

-- Allow anonymous read access to quiz config data
CREATE POLICY "Allow anonymous read dimensions" ON public.dimensions FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read options" ON public.options FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read app_settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read roadmap_modules" ON public.roadmap_modules FOR SELECT USING (true);

-- ============================================
-- Atomic Submit RPC Function
-- ============================================

CREATE OR REPLACE FUNCTION public.submit_assessment(
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
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_take_id uuid;
  v_token text;
  a jsonb;
BEGIN
  -- idempotency: if we already have this submission_hash, return existing token.
  IF p_submission_hash IS NOT NULL THEN
    SELECT id, token INTO v_take_id, v_token
    FROM public.quiz_takes
    WHERE submission_hash = p_submission_hash
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object('token', v_token);
    END IF;
  END IF;

  INSERT INTO public.quiz_takes(
    token,
    submission_hash,
    email,
    company,
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
  ) VALUES (
    p_token,
    p_submission_hash,
    p_email,
    p_company,
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
  RETURNING id, token INTO v_take_id, v_token;

  -- Insert answers
  FOR a IN SELECT * FROM jsonb_array_elements(p_answers)
  LOOP
    INSERT INTO public.answers(quiz_take_id, question_id, option_id, time_spent_ms)
    VALUES (
      v_take_id,
      (a->>'question_id'),
      (a->>'option_id'),
      COALESCE((a->>'time_spent_ms')::int, 0)
    );
  END LOOP;

  RETURN jsonb_build_object('token', v_token);

EXCEPTION WHEN unique_violation THEN
  -- race condition on submission_hash: return existing token if present
  IF p_submission_hash IS NOT NULL THEN
    SELECT token INTO v_token
    FROM public.quiz_takes
    WHERE submission_hash = p_submission_hash
    LIMIT 1;

    IF v_token IS NOT NULL THEN
      RETURN jsonb_build_object('token', v_token);
    END IF;
  END IF;

  RAISE;
END;
$$;

-- Restrict function execution to service role only
REVOKE ALL ON FUNCTION public.submit_assessment(
  text,text,text,text,numeric,numeric,int,jsonb,jsonb,text,jsonb,numeric,jsonb,jsonb,jsonb
) FROM public;

COMMIT;
