# PDF Customization Layer

This directory contains the five customization artifacts that enrich the Results report and PDF for the MaxMin DTC Analytics Maturity Assessment.

## Artifacts

### 1. answer-observations.json
Per-answer observations that provide personalized insights based on each quiz answer.

**Structure:**
```json
{
  "answer_observations": {
    "_meta": { "version": "x.y.z" },
    "q01_tracking_setup": {
      "dimension": "tracking",
      "options": {
        "q01_tracking_setup_o1": {
          "answer_text": "...",
          "score": 1,
          "observation_short": "Short takeaway (< 100 chars)",
          "observation_detail": "Detailed explanation",
          "red_flag": true
        }
      }
    }
  }
}
```

**Requirements:**
- All `question_id` values must exist in `config/questions.json`
- All `option_id` values must match canonical IDs (`qXX_*_o1..o5`)
- `dimension` must match the question's dimension in canonical config
- Copy must be minimal and scannable (no fluff)

### 2. dependency-rules.json
Cross-dimension dependencies and blocking relationships.

**Structure:**
```json
{
  "dependency_rules": {
    "_meta": { ... },
    "rules": [
      {
        "id": "tracking_blocks_all",
        "priority": 1,
        "condition": {
          "dimension": "tracking",
          "operator": "lt",
          "value": 2.0
        },
        "severity": "critical",
        "title": "Tracking Foundation Missing",
        "message": "...",
        "recommendation": "..."
      }
    ]
  }
}
```

**Supported condition operators:** `lt`, `lte`, `gt`, `gte`, `eq`
**Supported condition types:**
- Simple: `{ dimension, operator, value }`
- All: `{ all: [...] }`
- Any: `{ any: [...] }`
- Question: `{ question, option_in: ["o1", "o2"] }`

### 3. impact-estimates.json
Quantified business impact estimates by dimension and tier.

**Structure:**
```json
{
  "impact_estimates": {
    "_meta": { ... },
    "tracking": {
      "low": {
        "tier_range": "1.0 - 2.5",
        "primary_metric": "visibility_gap",
        "metric_value": "40-70%",
        "metric_label": "of customer journey invisible",
        "headline": "You're missing most of the picture",
        "detail": "...",
        "business_impact": ["..."],
        "cost_example": "...",
        "opportunity": "..."
      },
      "medium": { ... },
      "high": { ... }
    }
  }
}
```

**⚠️ Disclaimer:** Impact estimates are directional, not guaranteed. Include appropriate caveats in PDF.

### 4. level-benchmarks.json
What it takes to reach the next level for each dimension.

**Structure:**
```json
{
  "level_benchmarks": {
    "_meta": { ... },
    "tracking": {
      "1_to_2": {
        "current_level": 1,
        "current_name": "Reactive",
        "target_level": 2,
        "target_name": "Structured",
        "current_state": ["...", "...", "..."],
        "target_state": ["...", "...", "..."],
        "gap_summary": "...",
        "success_indicator": "...",
        "typical_timeline": "2-4 weeks"
      },
      "2_to_3": { ... }
    }
  }
}
```

### 5. tool-recommendations.json
Tool and vendor recommendations by dimension and tier.

**Structure:**
```json
{
  "tool_recommendations": {
    "_meta": {
      "price_legend": {
        "$": "Free or <$100/month",
        "$$": "$100-500/month",
        "$$$": "$500-2000/month",
        "$$$$": "$2000+/month"
      }
    },
    "tracking": {
      "low": {
        "context": "...",
        "quick_wins": ["...", "..."],
        "recommended_tools": [
          {
            "name": "Google Tag Manager",
            "category": "Tag Management",
            "price": "$",
            "fit": "Everyone—no reason not to use it",
            "url": "https://tagmanager.google.com",
            "note": "Free. Essential. Start here."
          }
        ],
        "diy_alternative": "..."
      }
    }
  }
}
```

**Guidelines:**
- Prefer tool categories over specific vendors
- Keep recommendations vendor-light (avoid lock-in language)
- Price tiers should be accurate as of last update

## Validation

All artifacts are validated against:
1. **JSON Schema** - Structure and types
2. **Referential Integrity** - All IDs must exist in canonical config
3. **No PII** - No email, company names, or personal data

### Run validation:
```bash
npm run validate:customization
```

This checks:
- Schema compliance
- All `question_id`, `option_id`, `dimension_id` exist
- Coverage (all questions/dimensions present)
- No PII patterns

## Determinism Strategy

**Option A (Implemented):** Snapshot at submit-time

When a quiz is submitted, the customization output is resolved and snapshotted as a JSON blob on the `quiz_takes` record. This ensures:
- Same token → same PDF content forever
- No drift as artifacts are updated
- Fast PDF generation (no re-resolution needed)

The resolver is a pure, deterministic function:
```typescript
import { resolveCustomization } from '@/lib/customization/resolver';

const output = resolveCustomization(results, answers);
// Returns: observations, flags, impacts, benchmarks, tools
```

## Usage in PDF Generation

```typescript
import { resolveCustomization } from '@/lib/customization/resolver';

// At submit-time:
const customization = resolveCustomization(resultsDTO, answers);
const snapshot = JSON.stringify(customization);

// Store in quiz_takes.customization_snapshot (jsonb)
await supabase
  .from('quiz_takes')
  .update({ customization_snapshot: snapshot })
  .eq('token', token);

// At PDF render-time:
const { data } = await supabase
  .from('quiz_takes')
  .select('customization_snapshot')
  .eq('token', token)
  .single();

const customization = JSON.parse(data.customization_snapshot);
// Use customization.observations_by_question, etc. in PDF templates
```

## Maintenance Workflow

When updating artifacts:

1. **Edit JSON file(s)** in `config/customization/`
2. **Run validator:** `npm run validate:customization`
3. **Fix errors** if any
4. **Run tests:** `npm test __tests__/lib/customization/`
5. **Update version** in `_meta.version` if schema changes
6. **Update CHANGELOG**
7. **Commit**

## Schema Changes

If you modify the structure (not just content):

1. Update schema in `config/schemas/customization/`
2. Update validator in `lib/customization/validator.ts`
3. Update resolver in `lib/customization/resolver.ts`
4. Update tests
5. Bump `_meta.version` in artifact

## Testing

```bash
# Run all tests
npm test

# Run only customization tests
npm test __tests__/lib/customization/

# Watch mode
npm run test:watch __tests__/lib/customization/
```

Tests verify:
- Schema compliance
- Referential integrity
- Determinism (same input → same output)
- Purity (no mutations)
- No PII leaks
- Performance (< 50ms per resolution)

## Quality Checklist

Before merging changes:

- [ ] All artifacts pass `npm run validate:customization`
- [ ] All tests pass
- [ ] No PII in any artifact (run PII test)
- [ ] Copy is minimal and scannable
- [ ] All question_id/option_id/dimension_id are canonical
- [ ] CHANGELOG updated
- [ ] Version bumped if schema changed

## Absolute DON'Ts

- ❌ Do not modify scoring rules or level boundaries here
- ❌ Do not add non-deterministic behavior (random, dates, etc.)
- ❌ Do not include email/company in PDF/OG output
- ❌ Do not hardcode quiz copy into templates (use these artifacts)
- ❌ Do not use shorthand IDs (`o1..o5`) without full question prefix

## Support

For questions or issues:
- Review canonical config: `config/questions.json`, `config/dimensions.json`
- Check validator output: `npm run validate:customization`
- Run tests: `npm test __tests__/lib/customization/`
- Review CHANGELOG for recent updates
