import type { LeadTier, Tier } from '@/types/quiz';

export type CtaIntensity = LeadTier;

export type ResultsDTO = {
  token: string;
  created_at: string;
  company: string | null;
  overall: {
    score: number;
    score_capped: number;
    level: { level: 1 | 2 | 3 | 4 | 5; key: string; name: string; hero_title: string; hero_copy: string; color_token: string };
  };
  dimensions: Array<{
    dimension_id: string;
    order: number;
    section: string;
    short_label: string;
    name: string;
    score: number;
    tier: Tier;
    is_primary_gap: boolean;
    is_critical_gap: boolean;
    delta_from_avg: number;
  }>;
  primary_gap: { dimension_id: string; score: number };
  critical_gaps: Array<{ dimension_id: string; score: number }>;
  roadmap: Array<{
    dimension_id: string;
    tier: Tier;
    what_it_means: string;
    now: string[];
    next: string[];
    later: string[];
    success_indicator: string;
  }>;
  cta: { intensity: CtaIntensity; reason_codes: string[] };
};
