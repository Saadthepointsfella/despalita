import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type DimensionRow = {
  id: string;
  order: number;
  section: string;
  short_label: string;
  name: string;
  description: string;
};

type QuestionRow = {
  id: string;
  order: number;
  prompt: string;
  dimension_id: string;
  dimension: DimensionRow | null;
  options: Array<{ id: string; order: number; label: string; score: number }> | null;
};

/**
 * Fetch the complete quiz in a single DB call (no N+1).
 * Returns dimensions and questions with nested options.
 */
export async function getFullQuiz() {
  const supabase = createSupabaseAdminClient();

  // Single query with joins
  const { data, error } = await supabase
    .from('questions')
    .select(
      `
        id, order, prompt, dimension_id,
        dimension:dimensions ( id, order, section, short_label, name, description ),
        options:options ( id, order, label, score )
      `
    )
    .order('order', { ascending: true });

  if (error || !data) {
    throw new Error('QUIZ_LOAD_FAILED');
  }

  const rows = data as unknown as QuestionRow[];

  // Normalize dimensions from the joined data
  const dimensionMap = new Map<string, DimensionRow>();
  for (const r of rows) {
    if (r.dimension) {
      dimensionMap.set(r.dimension.id, r.dimension);
    }
  }

  const dimensions = Array.from(dimensionMap.values()).sort((a, b) => a.order - b.order);

  const questions = rows.map((r) => ({
    id: r.id,
    order: r.order,
    prompt: r.prompt,
    dimension_id: r.dimension_id,
    options: (r.options ?? []).sort((a, b) => a.order - b.order),
  }));

  return { dimensions, questions };
}
