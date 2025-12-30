import type { LevelsJson, PreviewResult, QuizDimension, QuizQuestion } from './types';

function inRange(
  x: number,
  r: { min: number; max: number; min_inclusive: boolean; max_inclusive: boolean },
) {
  const aboveMin = r.min_inclusive ? x >= r.min : x > r.min;
  const belowMax = r.max_inclusive ? x <= r.max : x < r.max;
  return aboveMin && belowMax;
}

function round(value: number, decimals = 2) {
  const f = Math.pow(10, decimals);
  return Math.round(value * f) / f;
}

export function computePreview(params: {
  dimensions: QuizDimension[];
  questions: QuizQuestion[];
  levels: LevelsJson;
  answers: Record<string, string>;
}): PreviewResult {
  const { dimensions, questions, levels, answers } = params;

  const optionScoreByQ = new Map<string, Map<string, number>>();
  for (const q of questions) {
    optionScoreByQ.set(q.id, new Map(q.options.map((o) => [o.id, o.score])));
  }

  const dimScores: Array<{ dimension_id: string; score: number }> = [];

  for (const d of dimensions) {
    const qs = questions.filter((q) => q.dimension_id === d.id);
    const scores = qs.map((q) => {
      const optId = answers[q.id];
      const s = optionScoreByQ.get(q.id)?.get(optId);
      return typeof s === 'number' ? s : 1;
    });
    const avg = scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length);
    dimScores.push({ dimension_id: d.id, score: round(avg, 2) });
  }

  const overall = round(dimScores.reduce((s, d) => s + d.score, 0) / dimScores.length, 2);
  const level = levels.levels.find((l) => inRange(overall, l.score_range)) ?? levels.levels[0];

  const topGap = dimScores.reduce((min, d) => (d.score < min.score ? d : min), dimScores[0]);
  const topDim = dimensions.find((d) => d.id === topGap.dimension_id);

  return {
    overall_score: overall,
    level: { level: level.level, name: level.name, hero_title: level.hero_title, hero_copy: level.hero_copy },
    top_gap: { dimension_id: topGap.dimension_id, label: topDim?.short_label ?? topDim?.name ?? topGap.dimension_id },
  };
}
