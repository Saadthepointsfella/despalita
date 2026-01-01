export type DimensionKey =
  | 'tracking'
  | 'attribution'
  | 'reporting'
  | 'experimentation'
  | 'lifecycle'
  | 'infrastructure'
  | (string & {});

export type Tier = 'low' | 'medium' | 'high';

// Matches actual JSON structure: answer_observations.{question_id}.options.{option_id}
export type AnswerObservationPack = {
  answer_observations: Record<string, {
    question_text?: string;
    dimension?: string;
    options: Record<string, {
      answer_text?: string;
      score?: number;
      observation_short: string;
      observation_detail?: string;
      red_flag?: boolean;
    }>;
  }>;
};

// Matches actual JSON structure: impact_estimates.{dimension}.{tier}
export type ImpactPack = {
  impact_estimates: Record<DimensionKey, Record<Tier, {
    tier_range?: string;
    primary_metric?: string;
    metric_value?: string;
    metric_label?: string;
    headline: string;
    detail: string;  // JSON uses 'detail' not 'narrative'
    business_impact?: string[];
    cost_example?: string;
    opportunity?: string;
  }>>;
};

// Supports legacy per-dimension/tier tools AND technical_competitors bundle.
export type ToolRecommendationPack = {
  tool_recommendations_patch?: Record<string, Record<string, {
    context?: string;
    quick_wins?: string[];
    recommended_tools?: Array<{
      name: string;
      category?: string;
      price: string;
      fit?: string;
      url?: string;
      note?: string;
    }>;
    diy_alternative?: string;
  }>>;
  tool_recommendations?: Record<DimensionKey, Record<Tier, {
    context?: string;
    quick_wins?: string[];
    recommended_tools: Array<{
      name: string;
      category?: string;
      price: string;
      fit?: string;
      url?: string;
      note?: string;
    }>;
    diy_alternative?: string;
  }>>;
  technical_competitors?: {
    _meta?: Record<string, unknown>;
    [key: string]: {
      context?: string;
      recommended_tools?: Array<{
        name: string;
        category?: string;
        price: string;
        fit?: string;
        url?: string;
        note?: string;
      }>;
    } | undefined;
  };
  services_we_dont_do_keep_vendors_as_is?: {
    _meta?: Record<string, unknown>;
    [key: string]: {
      vendor_platforms?: Array<{
        name: string;
        category?: string;
        utility?: string;
        best_for?: string;
        watchouts?: string;
      }>;
    } | undefined;
  };
};

// Matches actual JSON structure: level_benchmarks.{dimension}.{from}_to_{to}
export type BenchmarksPack = {
  level_benchmarks: Record<DimensionKey, Record<string, {
    current_level?: number;
    current_name?: string;
    target_level?: number;
    target_name?: string;
    current_state?: string[];
    target_state: string[];  // This is what we show as "capabilities"
    gap_summary?: string;
    success_indicator: string;  // This is "you_know_you_are_there_when"
    typical_timeline?: string;
  }>>;
};

export type DependencyRulesPack = {
  dependency_rules: Array<{
    id: string;
    source_dimension_id: DimensionKey;
    target_dimension_id: DimensionKey;
    source_lte?: number;
    target_gte?: number;
    title: string;
    message: string;
    severity?: 'info' | 'warn' | 'critical';
  }>;
};

export type NextStepsPack = {
  next_steps_actions: Record<DimensionKey, Record<Tier, {
    this_week: string[];
    this_month: string[];
    this_quarter: string[];
  }>>;
  cta_text: Record<DimensionKey, {
    headline: string;
    body: string;
    email: string;
  }>;
};
