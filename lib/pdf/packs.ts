import 'server-only';

import answerObs from '@/config/customization/answer-observations.json';
import levelBench from '@/config/customization/level-benchmarks.json';
import toolRecs from '@/config/customization/tool-recommendations.json';
import impactEst from '@/config/customization/impact-estimates.json';
import dependencyRules from '@/config/customization/dependency-rules.json';

export type AnswerObservationsPack = typeof answerObs;
export type LevelBenchmarksPack = typeof levelBench;
export type ToolRecommendationsPack = typeof toolRecs;
export type ImpactEstimatesPack = typeof impactEst;
export type DependencyRulesPack = typeof dependencyRules;

export const pdfPacks = {
  answerObs,
  levelBench,
  toolRecs,
  impactEst,
  dependencyRules,
} as const;

// Helpers: support both canonical option IDs and "o1..o5" style keys
export function optionKeyFallback(optionId: string) {
  // common patterns:
  // - "q01_tracking_setup_o3"
  // - "o3"
  // - "opt_o3"
  const m = optionId.match(/(o[1-5])$/i);
  if (m?.[1]) return m[1].toLowerCase();
  if (/^o[1-5]$/i.test(optionId)) return optionId.toLowerCase();
  return null;
}
