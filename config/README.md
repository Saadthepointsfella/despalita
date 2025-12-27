# /config — Canonical Bundle (MaxMin DTC Analytics Maturity Assessment)

This folder is the **single source of truth** for:
- copy (questions, roadmaps)
- design tokens (colors/typography/layout primitives)
- deterministic scoring + tiering + CTA logic

Rule: **No React component may hard-code** quiz content, thresholds, or roadmap copy.

---

## Contents

- `tokens.json` — Design tokens (colors, type, spacing, radius, motifs).
- `dimensions.json` — The 6 dimensions (order, section number, short labels).
- `levels.json` — The 5 maturity levels + exact score ranges + hero copy.
- `questions.json` — The 24 behavior-based questions (5 options each, score 1..5).
- `roadmap-modules.json` — 18 modules (6 dimensions × 3 tiers) with Now/Next/Later.
- `scoring-rules.json` — Deterministic scoring rules (cap logic, tier thresholds, CTA rules).
- `schemas/` — JSON Schemas for every file in this bundle.
- `examples/` — Golden fixtures used to test scoring independent of UI.

---

## Maturity model

### Levels (overall score → level)
Score ranges are **continuous and gap-free**, with **inclusive** boundaries.

| Level | Key | Range (rule) |
|------:|-----|--------------|
| 1 | reactive | ≥1.0 and <2.0 |
| 2 | structured | ≥2.0 and <2.5 |
| 3 | systematic | ≥2.5 and <3.5 |
| 4 | integrated | ≥3.5 and <4.5 |
| 5 | compounding | ≥4.5 and ≤5.0 |

Boundary rule: `min_inclusive=true` for all levels; `max_inclusive=false` for levels 1–4 and `true` for level 5.

---

## Scoring rules (deterministic)

### Dimension score
Each dimension has 4 questions. Each answer option maps to a score in the set 1..5.

`dimension_score = average(scores_of_4_questions)`

### Base overall score
`base_overall_score = average(of 6 dimension_scores)`

### Weakest-link cap
If the weakest dimension is below 2.0, cap the overall score:

```
min_dim = min(dimension_scores)
if min_dim < 2.0:
  overall_score = min(base_overall_score, min_dim + 1.5)
else:
  overall_score = base_overall_score
```

This is fully specified in `scoring-rules.json` under `overall_scoring.weakest_link`.

### Gaps
- **Primary gap**: the lowest-scoring dimension (argmin).
- **Critical gap**: `dimension_score < base_overall_score - 1.5`
- **Foundation gap**: `dimension_score < 2.0` (used for CTA severity)

Note: `base_overall_score` is used as the reference average for gap detection (explicit in config).

### Rounding policy
- Internal stored scores: round to **2 decimals** (avoid float noise).
- UI display defaults: **1 decimal**.

---

## Roadmap tiering

Roadmap module tier is determined by **dimension score**, aligned with level boundaries:

- `low`: ≥1.0 and <2.5
- `medium`: ≥2.5 and <3.5
- `high`: ≥3.5 and ≤5.0

This is monotonic, deterministic, and UI-friendly.

---

## CTA tone selection

CTA tone is a deterministic rule list evaluated in priority order (see `scoring-rules.json → cta_rules`):

1. **Hot** if `foundation_gap_count >= 2`
2. **Warm** if `foundation_gap_count == 1`
3. **Warm** if `foundation_gap_count == 0` AND `critical_gap_count >= 1`
4. **Cool** otherwise

Each rule includes a `reason` string for debugging/telemetry.

---

## Conventions for editing copy

- Keep prompts **behavior-based** (observable actions).
- Avoid self-esteem language (e.g., “we’re pretty good”).
- Options must be objectively verifiable (tooling, cadence, processes, outputs).
- Roadmap bullets should be short, imperative, and specific.

---

## Change checklist

If you change **any** of:
- a level boundary
- tier thresholds
- cap logic
- gap delta / gap thresholds
- question option wording that affects meaning

You must also:
1. Update the relevant JSON Schema (if fields changed)
2. Update `examples/answers_example.json` if IDs changed
3. Recompute and update `examples/expected_scoring_output.json`
4. Verify all JSON files validate against schemas

---

## Validation

Schemas live in `schemas/`. Downstream phases should validate config on CI (or at app start) using these schemas.
