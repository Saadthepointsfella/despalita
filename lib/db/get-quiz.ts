import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type QuizDimensionRow = {
  id: string;
  order: number;
  section: string;
  short_label: string;
  name: string;
  description: string;
  icon?: string | null;
};

export type QuizOptionRow = {
  id: string;
  order: number;
  label: string;
  score: number;
};

export type QuizQuestionRow = {
  id: string;
  order: number;
  prompt: string;
  dimension_id: string;
  options: QuizOptionRow[];
};

export type QuizPayload = {
  dimensions: QuizDimensionRow[];
  questions: QuizQuestionRow[];
  levels: unknown;
};

export async function getQuizPayload(): Promise<QuizPayload> {
  const supabase = createSupabaseServerClient();

  const { data: dims, error: dimsErr } = await supabase
    .from('dimensions')
    .select('id, order, section, short_label, name, description, icon')
    .order('order', { ascending: true });

  if (dimsErr || !dims) throw new Error('Failed to load dimensions');

  const { data: qs, error: qErr } = await supabase
    .from('questions')
    .select('id, order, prompt, dimension_id, options(id, order, label, score)')
    .order('order', { ascending: true });

  if (qErr || !qs) throw new Error('Failed to load questions');

  const questions = (qs as any[]).map((q) => ({
    ...q,
    options: (q.options ?? []).slice().sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)),
  }));

  const { data: settings, error: sErr } = await supabase
    .from('app_settings')
    .select('key, value')
    .eq('key', 'levels')
    .limit(1)
    .single();

  if (sErr || !settings?.value) throw new Error('Missing levels in app_settings');

  return { dimensions: dims as any, questions: questions as any, levels: settings.value };
}
