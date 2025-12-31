import 'server-only';

import answerObs from '@/config/customization/answer-observations.json';
import deps from '@/config/customization/dependency-rules.json';
import impacts from '@/config/customization/impact-estimates.json';
import benchmarks from '@/config/customization/level-benchmarks.json';
import tools from '@/config/customization/tool-recommendations.json';

export function loadCustomizationData() {
  return {
    answer_observations: (answerObs as any).answer_observations,
    dependency_rules: (deps as any).dependency_rules,
    impact_estimates: (impacts as any).impact_estimates,
    level_benchmarks: (benchmarks as any).level_benchmarks,
    tool_recommendations: (tools as any).tool_recommendations,
  };
}
