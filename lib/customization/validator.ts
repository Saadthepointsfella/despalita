/**
 * PDF Customization Layer - Validator
 *
 * Validates customization artifacts against:
 * 1. JSON Schemas
 * 2. Referential integrity with canonical quiz config
 *
 * CRITICAL: All question_id, option_id, and dimension_id must exist in canonical config.
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';

// Import canonical config
import questionsConfig from '../../config/questions.json';
import dimensionsConfig from '../../config/dimensions.json';

// Import schemas
import answerObservationsSchema from '../../config/schemas/customization/answer-observations.schema.json';
import dependencyRulesSchema from '../../config/schemas/customization/dependency-rules.schema.json';
import impactEstimatesSchema from '../../config/schemas/customization/impact-estimates.schema.json';
import levelBenchmarksSchema from '../../config/schemas/customization/level-benchmarks.schema.json';
import toolRecommendationsSchema from '../../config/schemas/customization/tool-recommendations.schema.json';

// Types
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface ReferentialIntegrityResult {
  valid: boolean;
  errors: string[];
}

// Build canonical ID sets
const CANONICAL_QUESTION_IDS = new Set(questionsConfig.questions.map(q => q.id));
const CANONICAL_DIMENSION_IDS = new Set(dimensionsConfig.dimensions.map(d => d.id));
const CANONICAL_OPTION_IDS = new Set(
  questionsConfig.questions.flatMap(q => q.options.map(o => o.id))
);

// Build question -> dimension mapping
const QUESTION_TO_DIMENSION = new Map(
  questionsConfig.questions.map(q => [q.id, q.dimension_id])
);

// Build question -> option mapping
const QUESTION_TO_OPTIONS = new Map(
  questionsConfig.questions.map(q => [q.id, new Set(q.options.map(o => o.id))])
);

/**
 * Initialize AJV validator
 */
function createValidator() {
  const ajv = new Ajv({
    allErrors: true,
    strict: true,
  });
  addFormats(ajv);
  return ajv;
}

/**
 * Validate answer-observations.json
 */
export function validateAnswerObservations(data: any): ValidationResult {
  const ajv = createValidator();
  const validate = ajv.compile(answerObservationsSchema);
  const valid = validate(data);

  const errors: string[] = [];
  const warnings: string[] = [];

  // Schema validation
  if (!valid && validate.errors) {
    errors.push(...validate.errors.map(e => `Schema error: ${e.instancePath} ${e.message}`));
  }

  // Referential integrity checks
  if (data.answer_observations) {
    const obs = data.answer_observations;

    // Check each question_id
    for (const questionId of Object.keys(obs)) {
      if (questionId === '_meta') continue;

      if (!CANONICAL_QUESTION_IDS.has(questionId)) {
        errors.push(`Unknown question_id: ${questionId}`);
        continue;
      }

      const questionData = obs[questionId];

      // Check dimension_id matches
      const expectedDimension = QUESTION_TO_DIMENSION.get(questionId);
      if (questionData.dimension !== expectedDimension) {
        errors.push(
          `Question ${questionId}: dimension "${questionData.dimension}" does not match canonical "${expectedDimension}"`
        );
      }

      // Check all option_ids
      const expectedOptions = QUESTION_TO_OPTIONS.get(questionId);
      if (expectedOptions && questionData.options) {
        const actualOptions = new Set(Object.keys(questionData.options));

        // Check for missing options
        const expectedArr = Array.from(expectedOptions);
        for (const expected of expectedArr) {
          if (!actualOptions.has(expected)) {
            errors.push(`Question ${questionId}: missing option_id "${expected}"`);
          }
        }

        // Check for unknown options
        const actualArr = Array.from(actualOptions);
        for (const actual of actualArr) {
          if (!expectedOptions.has(actual)) {
            errors.push(`Question ${questionId}: unknown option_id "${actual}"`);
          }
        }
      }
    }

    // Check coverage: all questions should be present
    const canonicalArr = Array.from(CANONICAL_QUESTION_IDS);
    for (const questionId of canonicalArr) {
      if (!obs[questionId]) {
        warnings.push(`Missing observations for question_id: ${questionId}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate dependency-rules.json
 */
export function validateDependencyRules(data: any): ValidationResult {
  const ajv = createValidator();
  const validate = ajv.compile(dependencyRulesSchema);
  const valid = validate(data);

  const errors: string[] = [];
  const warnings: string[] = [];

  // Schema validation
  if (!valid && validate.errors) {
    errors.push(...validate.errors.map(e => `Schema error: ${e.instancePath} ${e.message}`));
  }

  // Referential integrity checks
  if (data.dependency_rules?.rules) {
    for (const rule of data.dependency_rules.rules) {
      // Check dimension references in conditions
      if (rule.condition?.dimension) {
        if (!CANONICAL_DIMENSION_IDS.has(rule.condition.dimension)) {
          errors.push(`Rule "${rule.id}": unknown dimension "${rule.condition.dimension}"`);
        }
      }

      // Check nested conditions (all/any)
      if (rule.condition?.all || rule.condition?.any) {
        const conditions = rule.condition.all || rule.condition.any;
        for (const cond of conditions) {
          if (cond.dimension && !CANONICAL_DIMENSION_IDS.has(cond.dimension)) {
            errors.push(`Rule "${rule.id}": unknown dimension "${cond.dimension}"`);
          }
          if (cond.question && !CANONICAL_QUESTION_IDS.has(cond.question)) {
            errors.push(`Rule "${rule.id}": unknown question "${cond.question}"`);
          }
        }
      }

      // Check blocks array
      if (rule.blocks) {
        for (const dim of rule.blocks) {
          if (!CANONICAL_DIMENSION_IDS.has(dim)) {
            errors.push(`Rule "${rule.id}": unknown dimension in blocks "${dim}"`);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate impact-estimates.json
 */
export function validateImpactEstimates(data: any): ValidationResult {
  const ajv = createValidator();
  const validate = ajv.compile(impactEstimatesSchema);
  const valid = validate(data);

  const errors: string[] = [];
  const warnings: string[] = [];

  // Schema validation
  if (!valid && validate.errors) {
    errors.push(...validate.errors.map(e => `Schema error: ${e.instancePath} ${e.message}`));
  }

  // Referential integrity checks
  if (data.impact_estimates) {
    for (const dimensionId of Object.keys(data.impact_estimates)) {
      if (dimensionId === '_meta') continue;

      if (!CANONICAL_DIMENSION_IDS.has(dimensionId)) {
        errors.push(`Unknown dimension_id: ${dimensionId}`);
      }
    }

    // Check coverage: all dimensions should be present
    for (const dimensionId of Array.from(CANONICAL_DIMENSION_IDS)) {
      if (!data.impact_estimates[dimensionId]) {
        warnings.push(`Missing impact estimates for dimension_id: ${dimensionId}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate level-benchmarks.json
 */
export function validateLevelBenchmarks(data: any): ValidationResult {
  const ajv = createValidator();
  const validate = ajv.compile(levelBenchmarksSchema);
  const valid = validate(data);

  const errors: string[] = [];
  const warnings: string[] = [];

  // Schema validation
  if (!valid && validate.errors) {
    errors.push(...validate.errors.map(e => `Schema error: ${e.instancePath} ${e.message}`));
  }

  // Referential integrity checks
  if (data.level_benchmarks) {
    for (const dimensionId of Object.keys(data.level_benchmarks)) {
      if (dimensionId === '_meta') continue;

      if (!CANONICAL_DIMENSION_IDS.has(dimensionId)) {
        errors.push(`Unknown dimension_id: ${dimensionId}`);
      }
    }

    // Check coverage: all dimensions should be present
    for (const dimensionId of Array.from(CANONICAL_DIMENSION_IDS)) {
      if (!data.level_benchmarks[dimensionId]) {
        warnings.push(`Missing benchmarks for dimension_id: ${dimensionId}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate tool-recommendations.json
 */
export function validateToolRecommendations(data: any): ValidationResult {
  const ajv = createValidator();
  const validate = ajv.compile(toolRecommendationsSchema);
  const valid = validate(data);

  const errors: string[] = [];
  const warnings: string[] = [];

  // Schema validation
  if (!valid && validate.errors) {
    errors.push(...validate.errors.map(e => `Schema error: ${e.instancePath} ${e.message}`));
  }

  // Referential integrity checks
  if (data.tool_recommendations) {
    for (const dimensionId of Object.keys(data.tool_recommendations)) {
      if (dimensionId === '_meta') continue;

      if (!CANONICAL_DIMENSION_IDS.has(dimensionId)) {
        errors.push(`Unknown dimension_id: ${dimensionId}`);
      }
    }

    // Check coverage: all dimensions should be present
    for (const dimensionId of Array.from(CANONICAL_DIMENSION_IDS)) {
      if (!data.tool_recommendations[dimensionId]) {
        warnings.push(`Missing tool recommendations for dimension_id: ${dimensionId}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate all customization artifacts
 */
export function validateAll(basePath?: string): {
  allValid: boolean;
  results: Record<string, ValidationResult>;
} {
  // Default to config/customization relative to project root
  const configBasePath = basePath || path.join(process.cwd(), 'config', 'customization');

  const results: Record<string, ValidationResult> = {
    'answer-observations': validateAnswerObservations(
      JSON.parse(fs.readFileSync(path.join(configBasePath, 'answer-observations.json'), 'utf-8'))
    ),
    'dependency-rules': validateDependencyRules(
      JSON.parse(fs.readFileSync(path.join(configBasePath, 'dependency-rules.json'), 'utf-8'))
    ),
    'impact-estimates': validateImpactEstimates(
      JSON.parse(fs.readFileSync(path.join(configBasePath, 'impact-estimates.json'), 'utf-8'))
    ),
    'level-benchmarks': validateLevelBenchmarks(
      JSON.parse(fs.readFileSync(path.join(configBasePath, 'level-benchmarks.json'), 'utf-8'))
    ),
    'tool-recommendations': validateToolRecommendations(
      JSON.parse(fs.readFileSync(path.join(configBasePath, 'tool-recommendations.json'), 'utf-8'))
    ),
  };

  const allValid = Object.values(results).every(r => r.valid);

  return { allValid, results };
}
