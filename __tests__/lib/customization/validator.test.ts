/**
 * Unit tests for customization validator
 */

import { describe, it, expect } from 'vitest';
import {
  validateAnswerObservations,
  validateDependencyRules,
  validateImpactEstimates,
  validateLevelBenchmarks,
  validateToolRecommendations,
  validateAll,
} from '../../../lib/customization/validator';

import answerObservationsData from '../../../config/customization/answer-observations.json';
import dependencyRulesData from '../../../config/customization/dependency-rules.json';
import impactEstimatesData from '../../../config/customization/impact-estimates.json';
import levelBenchmarksData from '../../../config/customization/level-benchmarks.json';
import toolRecommendationsData from '../../../config/customization/tool-recommendations.json';

describe('Customization Validator', () => {
  describe('validateAnswerObservations', () => {
    it('should validate correct answer-observations.json', () => {
      const result = validateAnswerObservations(answerObservationsData);

      if (!result.valid) {
        console.error('Validation errors:', result.errors);
      }

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject unknown question_id', () => {
      const invalidData = {
        answer_observations: {
          _meta: { description: 'test', total_entries: 1 },
          q99_invalid_question: {
            question_text: 'test',
            dimension: 'tracking',
            options: {},
          },
        },
      };

      const result = validateAnswerObservations(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('q99_invalid_question'))).toBe(true);
    });

    it('should reject mismatched dimension_id', () => {
      const invalidData = {
        answer_observations: {
          _meta: { description: 'test', total_entries: 1 },
          q01_tracking_setup: {
            question_text: 'test',
            dimension: 'attribution', // Wrong! Should be 'tracking'
            options: {},
          },
        },
      };

      const result = validateAnswerObservations(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('dimension'))).toBe(true);
    });

    it('should reject unknown option_id', () => {
      const invalidData = {
        answer_observations: {
          _meta: { description: 'test', total_entries: 1 },
          q01_tracking_setup: {
            question_text: 'test',
            dimension: 'tracking',
            options: {
              q01_tracking_setup_o99: {
                answer_text: 'test',
                score: 1,
                observation_short: 'test',
                observation_detail: 'test',
                red_flag: false,
              },
            },
          },
        },
      };

      const result = validateAnswerObservations(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('unknown option_id'))).toBe(true);
    });
  });

  describe('validateDependencyRules', () => {
    it('should validate correct dependency-rules.json', () => {
      const result = validateDependencyRules(dependencyRulesData);

      if (!result.valid) {
        console.error('Validation errors:', result.errors);
      }

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject unknown dimension in condition', () => {
      const invalidData = {
        dependency_rules: {
          _meta: { description: 'test', total_entries: 1 },
          rules: [
            {
              id: 'test_rule',
              priority: 1,
              condition: {
                dimension: 'invalid_dimension',
                operator: 'lt',
                value: 2.0,
              },
              severity: 'critical',
              title: 'Test',
              message: 'Test message',
            },
          ],
        },
      };

      const result = validateDependencyRules(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('unknown dimension'))).toBe(true);
    });
  });

  describe('validateImpactEstimates', () => {
    it('should validate correct impact-estimates.json', () => {
      const result = validateImpactEstimates(impactEstimatesData);

      if (!result.valid) {
        console.error('Validation errors:', result.errors);
      }

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject unknown dimension_id', () => {
      const invalidData = {
        impact_estimates: {
          _meta: { description: 'test', total_entries: 1 },
          invalid_dimension: {
            low: {
              tier_range: '1.0 - 2.5',
              primary_metric: 'test',
              metric_value: 'test',
              metric_label: 'test',
              headline: 'test',
              detail: 'test',
              business_impact: ['test'],
            },
            medium: {
              tier_range: '2.5 - 3.5',
              primary_metric: 'test',
              metric_value: 'test',
              metric_label: 'test',
              headline: 'test',
              detail: 'test',
              business_impact: ['test'],
            },
            high: {
              tier_range: '3.5 - 5.0',
              primary_metric: 'test',
              metric_value: 'test',
              metric_label: 'test',
              headline: 'test',
              detail: 'test',
              business_impact: ['test'],
            },
          },
        },
      };

      const result = validateImpactEstimates(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('invalid_dimension'))).toBe(true);
    });
  });

  describe('validateLevelBenchmarks', () => {
    it('should validate correct level-benchmarks.json', () => {
      const result = validateLevelBenchmarks(levelBenchmarksData);

      if (!result.valid) {
        console.error('Validation errors:', result.errors);
      }

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateToolRecommendations', () => {
    it('should validate correct tool-recommendations.json', () => {
      const result = validateToolRecommendations(toolRecommendationsData);

      if (!result.valid) {
        console.error('Validation errors:', result.errors);
      }

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateAll', () => {
    it('should validate all artifacts', () => {
      const { allValid, results } = validateAll();

      if (!allValid) {
        console.error('Validation results:', JSON.stringify(results, null, 2));
      }

      expect(allValid).toBe(true);

      // All artifacts should pass
      expect(results['answer-observations'].valid).toBe(true);
      expect(results['dependency-rules'].valid).toBe(true);
      expect(results['impact-estimates'].valid).toBe(true);
      expect(results['level-benchmarks'].valid).toBe(true);
      expect(results['tool-recommendations'].valid).toBe(true);
    });
  });

  describe('No PII leak test', () => {
    it('should not contain email addresses in any artifact', () => {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

      const artifacts = [
        { name: 'answer-observations', data: answerObservationsData },
        { name: 'dependency-rules', data: dependencyRulesData },
        { name: 'impact-estimates', data: impactEstimatesData },
        { name: 'level-benchmarks', data: levelBenchmarksData },
        { name: 'tool-recommendations', data: toolRecommendationsData },
      ];

      for (const artifact of artifacts) {
        const jsonStr = JSON.stringify(artifact.data);
        const matches = jsonStr.match(emailRegex);

        expect(matches).toBeNull();
      }
    });

    it('should not contain common PII patterns', () => {
      const piiPatterns = [
        /company_name/gi,
        /user_email/gi,
        /user_name/gi,
        /customer_email/gi,
      ];

      const artifacts = [
        { name: 'answer-observations', data: answerObservationsData },
        { name: 'dependency-rules', data: dependencyRulesData },
        { name: 'impact-estimates', data: impactEstimatesData },
        { name: 'level-benchmarks', data: levelBenchmarksData },
        { name: 'tool-recommendations', data: toolRecommendationsData },
      ];

      for (const artifact of artifacts) {
        const jsonStr = JSON.stringify(artifact.data);

        for (const pattern of piiPatterns) {
          const matches = jsonStr.match(pattern);
          expect(matches).toBeNull();
        }
      }
    });
  });
});
