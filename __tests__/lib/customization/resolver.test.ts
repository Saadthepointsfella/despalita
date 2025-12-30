/**
 * Unit tests for customization resolver
 */

import { describe, it, expect } from 'vitest';
import {
  resolveCustomization,
  createCustomizationSnapshot,
  type ResultsDTO,
  type Answer,
} from '../../../lib/customization/resolver';

// Sample test data
const sampleResults: ResultsDTO = {
  overall_level: 2,
  dimension_scores: [
    { dimension_id: 'tracking', score: 2.5, tier: 'medium', level: 2 },
    { dimension_id: 'attribution', score: 1.8, tier: 'low', level: 1 },
    { dimension_id: 'reporting', score: 3.2, tier: 'medium', level: 3 },
    { dimension_id: 'experimentation', score: 2.0, tier: 'low', level: 2 },
    { dimension_id: 'lifecycle', score: 2.8, tier: 'medium', level: 2 },
    { dimension_id: 'infrastructure', score: 1.5, tier: 'low', level: 1 },
  ],
  primary_gap_dimension: 'attribution',
  critical_gap_count: 2,
};

const sampleAnswers: Answer[] = [
  { question_id: 'q01_tracking_setup', option_id: 'q01_tracking_setup_o3' },
  { question_id: 'q02_tag_governance', option_id: 'q02_tag_governance_o2' },
  { question_id: 'q05_attribution_method', option_id: 'q05_attribution_method_o2' },
  { question_id: 'q06_incrementality', option_id: 'q06_incrementality_o1' },
];

describe('Customization Resolver', () => {
  describe('resolveCustomization', () => {
    it('should resolve customization data from results and answers', () => {
      const output = resolveCustomization(sampleResults, sampleAnswers);

      // Should have all required fields
      expect(output).toHaveProperty('observations_by_question');
      expect(output).toHaveProperty('dependency_flags');
      expect(output).toHaveProperty('impact_blocks');
      expect(output).toHaveProperty('level_benchmarks');
      expect(output).toHaveProperty('tool_recommendations');

      // Observations should match answers
      expect(Object.keys(output.observations_by_question)).toEqual(
        expect.arrayContaining(['q01_tracking_setup', 'q02_tag_governance'])
      );

      // Should have observations for selected options
      expect(output.observations_by_question['q01_tracking_setup']).toHaveProperty(
        'q01_tracking_setup_o3'
      );

      // Impact blocks should match dimension count
      expect(output.impact_blocks).toHaveLength(6);

      // Each impact block should have correct tier
      const trackingImpact = output.impact_blocks.find(b => b.dimension_id === 'tracking');
      expect(trackingImpact?.tier).toBe('medium');

      const attributionImpact = output.impact_blocks.find(b => b.dimension_id === 'attribution');
      expect(attributionImpact?.tier).toBe('low');

      // Tool recommendations should match dimension count
      expect(output.tool_recommendations).toHaveLength(6);
    });

    it('should resolve dependency flags based on conditions', () => {
      const output = resolveCustomization(sampleResults, sampleAnswers);

      // Should have some dependency flags (based on low infrastructure score)
      expect(output.dependency_flags.length).toBeGreaterThan(0);

      // Flags should be sorted by priority
      for (let i = 0; i < output.dependency_flags.length - 1; i++) {
        expect(output.dependency_flags[i].priority).toBeLessThanOrEqual(
          output.dependency_flags[i + 1].priority
        );
      }

      // Each flag should have required fields
      for (const flag of output.dependency_flags) {
        expect(flag).toHaveProperty('id');
        expect(flag).toHaveProperty('priority');
        expect(flag).toHaveProperty('severity');
        expect(flag).toHaveProperty('title');
        expect(flag).toHaveProperty('message');
        expect(flag).toHaveProperty('pdf_section');
      }
    });

    it('should resolve level benchmarks for dimensions not at max level', () => {
      const output = resolveCustomization(sampleResults, sampleAnswers);

      // Should have benchmarks for dimensions below level 5
      expect(output.level_benchmarks.length).toBeGreaterThan(0);

      // Each benchmark should have transition data
      for (const benchmark of output.level_benchmarks) {
        expect(benchmark).toHaveProperty('dimension_id');
        expect(benchmark).toHaveProperty('current_level');
        expect(benchmark).toHaveProperty('target_level');
        expect(benchmark.target_level).toBe(benchmark.current_level + 1);
        expect(benchmark).toHaveProperty('current_state');
        expect(benchmark).toHaveProperty('target_state');
        expect(benchmark).toHaveProperty('gap_summary');
        expect(benchmark).toHaveProperty('success_indicator');
      }
    });

    it('should be deterministic (same input → same output)', () => {
      const output1 = resolveCustomization(sampleResults, sampleAnswers);
      const output2 = resolveCustomization(sampleResults, sampleAnswers);

      // Should produce identical results
      expect(JSON.stringify(output1)).toBe(JSON.stringify(output2));
    });

    it('should be pure (not mutate input)', () => {
      const resultsCopy = JSON.parse(JSON.stringify(sampleResults));
      const answersCopy = JSON.parse(JSON.stringify(sampleAnswers));

      resolveCustomization(sampleResults, sampleAnswers);

      // Input should be unchanged
      expect(JSON.stringify(sampleResults)).toBe(JSON.stringify(resultsCopy));
      expect(JSON.stringify(sampleAnswers)).toBe(JSON.stringify(answersCopy));
    });

    it('should handle empty answers gracefully', () => {
      const output = resolveCustomization(sampleResults, []);

      expect(output.observations_by_question).toEqual({});
      expect(output.impact_blocks).toHaveLength(6); // Still have impact blocks
      expect(output.tool_recommendations).toHaveLength(6);
    });

    it('should handle max-level dimensions correctly', () => {
      const maxLevelResults: ResultsDTO = {
        overall_level: 5,
        dimension_scores: [
          { dimension_id: 'tracking', score: 5.0, tier: 'high', level: 5 },
          { dimension_id: 'attribution', score: 5.0, tier: 'high', level: 5 },
          { dimension_id: 'reporting', score: 5.0, tier: 'high', level: 5 },
          { dimension_id: 'experimentation', score: 5.0, tier: 'high', level: 5 },
          { dimension_id: 'lifecycle', score: 5.0, tier: 'high', level: 5 },
          { dimension_id: 'infrastructure', score: 5.0, tier: 'high', level: 5 },
        ],
      };

      const output = resolveCustomization(maxLevelResults, []);

      // Should have no level benchmarks (all at max)
      expect(output.level_benchmarks).toHaveLength(0);

      // Should still have impact blocks and tool recommendations
      expect(output.impact_blocks).toHaveLength(6);
      expect(output.tool_recommendations).toHaveLength(6);

      // All should be in 'high' tier
      for (const block of output.impact_blocks) {
        expect(block.tier).toBe('high');
      }
    });
  });

  describe('createCustomizationSnapshot', () => {
    it('should create valid JSON snapshot', () => {
      const snapshot = createCustomizationSnapshot(sampleResults, sampleAnswers);

      // Should be valid JSON
      expect(() => JSON.parse(snapshot)).not.toThrow();

      const parsed = JSON.parse(snapshot);

      // Should have all required fields
      expect(parsed).toHaveProperty('observations_by_question');
      expect(parsed).toHaveProperty('dependency_flags');
      expect(parsed).toHaveProperty('impact_blocks');
      expect(parsed).toHaveProperty('level_benchmarks');
      expect(parsed).toHaveProperty('tool_recommendations');
    });

    it('should be deterministic', () => {
      const snapshot1 = createCustomizationSnapshot(sampleResults, sampleAnswers);
      const snapshot2 = createCustomizationSnapshot(sampleResults, sampleAnswers);

      expect(snapshot1).toBe(snapshot2);
    });

    it('should be restorable', () => {
      const snapshot = createCustomizationSnapshot(sampleResults, sampleAnswers);
      const restored = JSON.parse(snapshot);
      const original = resolveCustomization(sampleResults, sampleAnswers);

      expect(JSON.stringify(restored)).toBe(JSON.stringify(original));
    });
  });

  describe('Dependency flag evaluation', () => {
    it('should trigger low tracking flag when tracking < 2.0', () => {
      const lowTrackingResults: ResultsDTO = {
        overall_level: 1,
        dimension_scores: [
          { dimension_id: 'tracking', score: 1.5, tier: 'low', level: 1 },
          { dimension_id: 'attribution', score: 2.5, tier: 'medium', level: 2 },
          { dimension_id: 'reporting', score: 2.5, tier: 'medium', level: 2 },
          { dimension_id: 'experimentation', score: 2.5, tier: 'medium', level: 2 },
          { dimension_id: 'lifecycle', score: 2.5, tier: 'medium', level: 2 },
          { dimension_id: 'infrastructure', score: 2.5, tier: 'medium', level: 2 },
        ],
      };

      const output = resolveCustomization(lowTrackingResults, []);

      // Should have a critical tracking flag
      const trackingFlag = output.dependency_flags.find(f => f.id === 'tracking_blocks_all');
      expect(trackingFlag).toBeDefined();
      expect(trackingFlag?.severity).toBe('critical');
    });

    it('should interpolate dimension scores in messages', () => {
      const output = resolveCustomization(sampleResults, sampleAnswers);

      // Find a flag with score interpolation
      const flagWithScore = output.dependency_flags.find(f => f.message.includes('/5'));

      if (flagWithScore) {
        // Should have numeric score in message
        expect(flagWithScore.message).toMatch(/\d+\.\d+\/5/);
      }
    });
  });

  describe('Performance', () => {
    it('should resolve in < 50ms for typical quiz', () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        resolveCustomization(sampleResults, sampleAnswers);
      }

      const elapsed = Date.now() - start;
      const avgTime = elapsed / 100;

      expect(avgTime).toBeLessThan(50);
    });
  });
});
