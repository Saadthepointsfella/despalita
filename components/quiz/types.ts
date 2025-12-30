export type QuizStatus = 'loading' | 'in_quiz' | 'preview' | 'gated' | 'submitting' | 'error';

export type UTM = { source?: string; medium?: string; campaign?: string };

export type QuizDimension = {
  id: string;
  order: number;
  section: string;
  short_label: string;
  name: string;
  description: string;
};

export type QuizOption = {
  id: string;
  order: number;
  label: string;
  score: number;
};

export type QuizQuestion = {
  id: string;
  order: number;
  prompt: string;
  dimension_id: string;
  options: QuizOption[];
};

export type LevelsJson = {
  levels: Array<{
    level: 1 | 2 | 3 | 4 | 5;
    key: string;
    name: string;
    score_range: { min: number; max: number; min_inclusive: boolean; max_inclusive: boolean };
    hero_title: string;
    hero_copy: string;
    color_token: string;
  }>;
};

export type PreviewResult = {
  overall_score: number;
  level: { level: 1 | 2 | 3 | 4 | 5; name: string; hero_title: string; hero_copy: string };
  top_gap: { dimension_id: string; label: string };
};
