#!/usr/bin/env tsx
/**
 * Validation script for PDF customization artifacts
 *
 * Usage: npm run validate:customization
 * or: tsx scripts/validate-customization.ts
 */

import { validateAll } from '../lib/customization/validator';

console.log('🔍 Validating PDF Customization Artifacts...\n');

const { allValid, results } = validateAll();

let hasErrors = false;
let hasWarnings = false;

for (const [name, result] of Object.entries(results)) {
  const status = result.valid ? '✅' : '❌';
  console.log(`${status} ${name}.json`);

  if (result.errors.length > 0) {
    hasErrors = true;
    console.log('  Errors:');
    for (const error of result.errors) {
      console.log(`    - ${error}`);
    }
  }

  if (result.warnings.length > 0) {
    hasWarnings = true;
    console.log('  Warnings:');
    for (const warning of result.warnings) {
      console.log(`    - ${warning}`);
    }
  }

  if (result.valid && result.warnings.length === 0) {
    console.log('  ✓ All checks passed\n');
  } else {
    console.log('');
  }
}

console.log('━'.repeat(60));

if (allValid) {
  console.log('✅ All artifacts are valid!');
  if (hasWarnings) {
    console.log('⚠️  Some warnings were found (see above)');
  }
  process.exit(0);
} else {
  console.log('❌ Validation failed. Fix errors above before proceeding.');
  process.exit(1);
}
