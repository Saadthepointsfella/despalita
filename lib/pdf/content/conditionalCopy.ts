import type { DimensionKey, Tier } from './types';

/**
 * Conditional Copy System
 *
 * This module prevents contradictory copy in PDFs by:
 * 1. Extracting capabilities/facts from user answers
 * 2. Selecting copy templates based on those facts
 * 3. Validating consistency between observations and impact copy
 *
 * Example contradiction this prevents:
 * - "What you told us" says: "You have solid event tracking with documentation"
 * - "Why this matters" should NOT say: "Without comprehensive tracking..."
 */

/**
 * Capability states derived from user answers.
 * Each capability is a boolean or level indicating what the user claims to have/do.
 */
export type CapabilityState = {
  // Tracking capabilities
  hasBasicTracking: boolean;
  hasAdvancedTracking: boolean;
  hasServerSideTracking: boolean;
  hasTagManagement: boolean;
  hasDocumentedProcesses: boolean;

  // Attribution capabilities
  hasAttributionModel: boolean;
  hasMultiTouchAttribution: boolean;
  hasIncrementalityTesting: boolean;

  // Reporting capabilities
  hasDashboards: boolean;
  hasAutomatedReporting: boolean;
  hasSelfServeAnalytics: boolean;

  // Experimentation capabilities
  hasABTesting: boolean;
  hasTestingRoadmap: boolean;
  hasStatisticalRigor: boolean;

  // Lifecycle capabilities
  hasSegmentation: boolean;
  hasPersonalization: boolean;
  hasAutomatedCampaigns: boolean;

  // Infrastructure capabilities
  hasDataWarehouse: boolean;
  hasCleanData: boolean;
  hasRealTimeData: boolean;
};

/**
 * Answer summary for a dimension - extracted from user's quiz answers.
 */
export type DimensionAnswerSummary = {
  dimension_id: DimensionKey;
  answers: Array<{
    question_id: string;
    option_id: string;
    score: number;
  }>;
  avgScore: number;
  tier: Tier;
};

/**
 * Extract capabilities from user's answers.
 * Maps scores to capability flags based on answer semantics.
 */
export function extractCapabilities(
  answerSummaries: DimensionAnswerSummary[]
): CapabilityState {
  const caps: CapabilityState = {
    hasBasicTracking: false,
    hasAdvancedTracking: false,
    hasServerSideTracking: false,
    hasTagManagement: false,
    hasDocumentedProcesses: false,
    hasAttributionModel: false,
    hasMultiTouchAttribution: false,
    hasIncrementalityTesting: false,
    hasDashboards: false,
    hasAutomatedReporting: false,
    hasSelfServeAnalytics: false,
    hasABTesting: false,
    hasTestingRoadmap: false,
    hasStatisticalRigor: false,
    hasSegmentation: false,
    hasPersonalization: false,
    hasAutomatedCampaigns: false,
    hasDataWarehouse: false,
    hasCleanData: false,
    hasRealTimeData: false,
  };

  for (const summary of answerSummaries) {
    const { dimension_id, avgScore, answers } = summary;

    // Derive capabilities based on dimension scores and specific answers
    switch (dimension_id) {
      case 'tracking':
        caps.hasBasicTracking = avgScore >= 2;
        caps.hasAdvancedTracking = avgScore >= 3;
        caps.hasServerSideTracking = avgScore >= 4.5;
        // Check for specific tag management answer
        caps.hasTagManagement = answers.some(a =>
          a.question_id.includes('tag') && a.score >= 3
        );
        caps.hasDocumentedProcesses = avgScore >= 3;
        break;

      case 'attribution':
        caps.hasAttributionModel = avgScore >= 2;
        caps.hasMultiTouchAttribution = avgScore >= 3;
        caps.hasIncrementalityTesting = avgScore >= 4;
        break;

      case 'reporting':
        caps.hasDashboards = avgScore >= 2;
        caps.hasAutomatedReporting = avgScore >= 3;
        caps.hasSelfServeAnalytics = avgScore >= 4;
        break;

      case 'experimentation':
        caps.hasABTesting = avgScore >= 2;
        caps.hasTestingRoadmap = avgScore >= 3;
        caps.hasStatisticalRigor = avgScore >= 4;
        break;

      case 'lifecycle':
        caps.hasSegmentation = avgScore >= 2;
        caps.hasPersonalization = avgScore >= 3;
        caps.hasAutomatedCampaigns = avgScore >= 4;
        break;

      case 'infrastructure':
        caps.hasDataWarehouse = avgScore >= 2;
        caps.hasCleanData = avgScore >= 3;
        caps.hasRealTimeData = avgScore >= 4;
        break;
    }
  }

  return caps;
}

/**
 * Copy variant key - describes what state the copy assumes.
 */
export type CopyVariantKey =
  | 'no_capability'     // User doesn't have this capability
  | 'basic_capability'  // User has basic version
  | 'advanced_capability' // User has advanced version
  | 'default';          // Fallback

/**
 * Determine which copy variant to use based on capabilities.
 */
export function selectCopyVariant(
  dimension: DimensionKey,
  tier: Tier,
  caps: CapabilityState
): CopyVariantKey {
  // Map dimension + tier + capabilities to the appropriate copy variant

  switch (dimension) {
    case 'tracking':
      if (caps.hasServerSideTracking) return 'advanced_capability';
      if (caps.hasAdvancedTracking) return 'basic_capability';
      return 'no_capability';

    case 'attribution':
      if (caps.hasIncrementalityTesting) return 'advanced_capability';
      if (caps.hasMultiTouchAttribution) return 'basic_capability';
      if (caps.hasAttributionModel) return 'basic_capability';
      return 'no_capability';

    case 'reporting':
      if (caps.hasSelfServeAnalytics) return 'advanced_capability';
      if (caps.hasAutomatedReporting) return 'basic_capability';
      if (caps.hasDashboards) return 'basic_capability';
      return 'no_capability';

    case 'experimentation':
      if (caps.hasStatisticalRigor) return 'advanced_capability';
      if (caps.hasTestingRoadmap) return 'basic_capability';
      if (caps.hasABTesting) return 'basic_capability';
      return 'no_capability';

    case 'lifecycle':
      if (caps.hasAutomatedCampaigns) return 'advanced_capability';
      if (caps.hasPersonalization) return 'basic_capability';
      if (caps.hasSegmentation) return 'basic_capability';
      return 'no_capability';

    case 'infrastructure':
      if (caps.hasRealTimeData) return 'advanced_capability';
      if (caps.hasCleanData) return 'basic_capability';
      if (caps.hasDataWarehouse) return 'basic_capability';
      return 'no_capability';

    default:
      return 'default';
  }
}

/**
 * Impact copy templates keyed by capability variant.
 * This structure allows selecting different "Why this matters" copy
 * based on what the user already has.
 */
export type ConditionalImpactCopy = {
  no_capability: {
    headline: string;
    detail: string;
  };
  basic_capability: {
    headline: string;
    detail: string;
  };
  advanced_capability: {
    headline: string;
    detail: string;
  };
};

/**
 * Get conditional impact copy for a dimension/tier.
 * Falls back to existing copy if no conditional variant exists.
 */
export function getConditionalImpactCopy(
  dimension: DimensionKey,
  tier: Tier,
  variant: CopyVariantKey,
  // Fallback from existing impact pack
  fallbackCopy: { headline: string; detail: string } | null
): { headline: string; detail: string } {
  // Look up conditional copy from embedded templates
  const conditionalTemplates = CONDITIONAL_IMPACT_TEMPLATES[dimension]?.[tier];

  if (conditionalTemplates && variant !== 'default') {
    const variantKey = variant as keyof ConditionalImpactCopy;
    const copy = conditionalTemplates[variantKey];
    if (copy) {
      return copy;
    }
  }

  // Fall back to existing copy
  return fallbackCopy ?? {
    headline: 'Opportunity for improvement',
    detail: 'Based on your assessment, there are opportunities to improve in this area.',
  };
}

/**
 * Validate that observation copy and impact copy are consistent.
 * Returns warnings for any contradictions detected.
 */
export function validateCopyConsistency(
  observations: string[],
  impactCopy: { headline: string; detail: string },
  caps: CapabilityState,
  dimension: DimensionKey
): string[] {
  const warnings: string[] = [];

  // Define contradiction patterns per dimension
  const contradictionChecks: Record<string, () => boolean> = {
    // If observations mention having tracking, impact shouldn't say "without tracking"
    tracking_no_tracking: () =>
      caps.hasBasicTracking &&
      (impactCopy.detail.toLowerCase().includes('without tracking') ||
       impactCopy.detail.toLowerCase().includes('no tracking')),

    // If observations mention having attribution, impact shouldn't say "without attribution"
    attribution_no_attribution: () =>
      caps.hasAttributionModel &&
      (impactCopy.detail.toLowerCase().includes('without attribution') ||
       impactCopy.detail.toLowerCase().includes('no attribution')),

    // If observations mention having dashboards, impact shouldn't say "no visibility"
    reporting_no_visibility: () =>
      caps.hasDashboards &&
      impactCopy.detail.toLowerCase().includes('no visibility'),

    // If observations mention running tests, impact shouldn't say "no testing"
    experimentation_no_testing: () =>
      caps.hasABTesting &&
      (impactCopy.detail.toLowerCase().includes('no testing') ||
       impactCopy.detail.toLowerCase().includes("aren't testing")),
  };

  // Run relevant checks based on dimension
  for (const [checkId, checkFn] of Object.entries(contradictionChecks)) {
    if (checkId.startsWith(dimension) && checkFn()) {
      warnings.push(`Copy contradiction detected: ${checkId}`);
    }
  }

  return warnings;
}

/**
 * Conditional impact templates.
 * These provide alternative "Why this matters" copy based on user's capability state.
 *
 * Structure: CONDITIONAL_IMPACT_TEMPLATES[dimension][tier][variant]
 */
const CONDITIONAL_IMPACT_TEMPLATES: Partial<Record<
  DimensionKey,
  Partial<Record<Tier, Partial<ConditionalImpactCopy>>>
>> = {
  tracking: {
    low: {
      no_capability: {
        headline: "You're missing most of the picture",
        detail: "Without comprehensive tracking, 40-70% of customer behavior is invisible. You can see that people visited and some purchased, but you can't see why they converted, where they hesitated, or what drove them to buy.",
      },
      basic_capability: {
        headline: "Your tracking has significant gaps",
        detail: "While you have basic tracking in place, there are critical blind spots in your customer journey visibility. You're capturing some events but missing the micro-conversions and engagement signals that reveal true intent.",
      },
      advanced_capability: {
        headline: "Good foundation with room to grow",
        detail: "You have solid tracking infrastructure, but there are opportunities to capture additional signals that would enable more sophisticated analysis. Focus on edge cases and emerging channels.",
      },
    },
    medium: {
      no_capability: {
        headline: "Critical gaps limit your insights",
        detail: "You're tracking the core funnel but likely missing cross-device identity, offline touchpoints, or engagement signals that predict intent. These gaps limit advanced use cases.",
      },
      basic_capability: {
        headline: "Specific gaps need attention",
        detail: "Your tracking captures most key events, but specific gaps are limiting your ability to build unified customer profiles. Cross-device and server-side tracking would unlock significant value.",
      },
      advanced_capability: {
        headline: "Fine-tune for maximum value",
        detail: "Your tracking is mature. The opportunity is ensuring it stays accurate as platforms change, and leveraging the data more fully for advanced analytics and personalization.",
      },
    },
  },
  attribution: {
    low: {
      no_capability: {
        headline: "You're flying blind on channel contribution",
        detail: "Without proper attribution, you're letting platforms grade their own homework. Each ad platform claims credit using favorable methodologies, resulting in over-counting of conversions.",
      },
      basic_capability: {
        headline: "Your attribution needs validation",
        detail: "You have some attribution in place, but without incrementality testing, you can't be confident the model reflects true channel contribution. Platform-reported metrics may be inflated.",
      },
      advanced_capability: {
        headline: "Refine and maintain your model",
        detail: "Your attribution is more sophisticated than most, but continuous calibration is needed as channel mix evolves and customer behavior changes.",
      },
    },
  },
  reporting: {
    low: {
      no_capability: {
        headline: "Decisions are made on gut feel",
        detail: "Without accessible reporting, your team can't make data-driven decisions quickly. Ad-hoc analysis means insights come too late to act on, and different teams may be working from conflicting data.",
      },
      basic_capability: {
        headline: "Reporting exists but isn't actionable",
        detail: "You have dashboards, but they may not be answering the right questions or reaching the right people. The gap is between having data and having insights that drive action.",
      },
    },
  },
  experimentation: {
    low: {
      no_capability: {
        headline: "You're optimizing without validation",
        detail: "Without A/B testing, every change is a gamble. You might be making improvements, but you also might be hurting conversion without knowing it. Gut-feel optimization plateaus quickly.",
      },
      basic_capability: {
        headline: "Testing exists but lacks rigor",
        detail: "You're running tests, but without proper statistical methodology and a testing roadmap, results may be unreliable. Ad-hoc testing captures low-hanging fruit but misses systematic optimization.",
      },
    },
  },
  lifecycle: {
    low: {
      no_capability: {
        headline: "Every customer gets the same experience",
        detail: "Without segmentation and personalization, you're leaving significant revenue on the table. Your best customers get the same treatment as first-time visitors, and you can't target based on behavior or value.",
      },
      basic_capability: {
        headline: "Segmentation exists but isn't activated",
        detail: "You have customer segments defined, but they're not being used to personalize experiences or automate campaigns. The data exists; the activation layer is missing.",
      },
    },
  },
  infrastructure: {
    low: {
      no_capability: {
        headline: "Your data is scattered and inconsistent",
        detail: "Without a unified data layer, you're reconciling numbers from different sources that never match. Analysis requires manual data wrangling, and joining customer data across systems is nearly impossible.",
      },
      basic_capability: {
        headline: "Data exists but isn't clean or accessible",
        detail: "You have data infrastructure, but quality issues and access barriers limit its utility. Teams may be working from stale or inconsistent data, and getting answers requires technical resources.",
      },
    },
  },
};
