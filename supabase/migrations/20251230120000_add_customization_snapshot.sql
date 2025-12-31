-- Add customization_snapshot column to quiz_takes
ALTER TABLE public.quiz_takes
  ADD COLUMN IF NOT EXISTS customization_snapshot jsonb;

COMMENT ON COLUMN public.quiz_takes.customization_snapshot IS
  'Resolved customization payload used for PDF/Email rendering (observations, dependencies, impact, benchmarks, tools).';
