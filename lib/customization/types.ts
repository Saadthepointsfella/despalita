export type Tier = 'low' | 'medium' | 'high';

export type DependencySeverity = 'critical' | 'warning' | 'info';

export type AnswerObservation = {
  observation_short: string;
  observation_detail: string;
  red_flag?: boolean;
};

export type DependencyAlert = {
  id: string;
  priority: number;
  severity: DependencySeverity;
  title: string;
  message: string;
  recommendation: string;
  blocks?: string[];
};

export type ImpactBlock = {
  dimension_id: string;
  tier: Tier;
  headline: string;
  metric_value: string;
  metric_label: string;
  detail: string;
  business_impact: string[];
  cost_example?: string;
  opportunity?: string;
};

export type ToolRec = {
  name: string;
  category: string;
  price: string;
  fit: string;
  url?: string;
  note?: string;
};

export type ToolBlock = {
  dimension_id: string;
  tier: Tier;
  context: string;
  quick_wins: string[];
  recommended_tools: ToolRec[];
  diy_alternative?: string;
};

export type BenchmarkBlock = {
  dimension_id: string;
  from_level: number;
  to_level: number;
  current_state: string[];
  target_state: string[];
  gap_summary: string;
  success_indicator: string;
  typical_timeline: string;
};

export type CustomizationSnapshot = {
  version: string;
  created_at_iso: string;

  observations: Array<{
    question_id: string;
    option_id: string;
    score: number;
    observation_short: string;
    observation_detail: string;
    red_flag: boolean;
  }>;

  dependency_alerts: DependencyAlert[];

  impacts: ImpactBlock[];

  benchmarks: BenchmarkBlock[];

  tools: ToolBlock[];
};
