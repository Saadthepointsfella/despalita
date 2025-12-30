# Assessment System Documentation

## Overview

The MaxMin DTC Analytics Maturity Assessment is a 24-question quiz that evaluates organizations across 6 dimensions, producing a maturity score (1-5), personalized roadmap, and downloadable PDF report.

---

## 1. Quiz Flow

### User Journey

```
Landing Page (/assessment)
       ↓
Quiz Page (/assessment/quiz)
       ↓
24 Questions (4 per dimension)
       ↓
Preview Screen (client-side score preview)
       ↓
Email Gate (email required, company optional)
       ↓
Submit → Server-side scoring
       ↓
Results Page (/results/[token])
       ↓
PDF Download (/api/pdf/[token])
```

### Stage Details

| Stage | Description |
|-------|-------------|
| **Quiz Init** | Server loads questions, dimensions, levels from DB |
| **Answering** | One question at a time, progress bar updates, keyboard navigation (↑/↓/Enter/Esc) |
| **Preview** | After Q24, client calculates preview score showing level + top gap |
| **Email Gate** | User enters email (required) + company (optional), honeypot for bot detection |
| **Submit** | POST to `/api/assessment/submit` with answers + timings + UTM |
| **Results** | Redirect to `/results/[token]` with full breakdown |
| **PDF** | On-demand generation, cached for 24 hours |

---

## 2. Assessment Content

### The 6 Dimensions

| # | ID | Label | Full Name | What It Measures |
|---|-----|-------|-----------|------------------|
| 1 | `tracking` | Tracking | Tracking & Data Collection | How completely you capture user actions and unify identities across tools |
| 2 | `attribution` | Attribution | Attribution & Measurement | How you measure channel impact and allocate budget with confidence |
| 3 | `reporting` | Reporting | Reporting & Dashboards | How quickly teams can see reality and act on it from a single source of truth |
| 4 | `experimentation` | Testing | Experimentation & Testing | How you run tests, learn fast, and turn insights into repeatable wins |
| 5 | `lifecycle` | Lifecycle | Lifecycle & CRM | How you grow retention with segmentation, CLV, and lifecycle programs |
| 6 | `infrastructure` | Infra | Data Infrastructure | How data is stored, integrated, validated, and made usable across the org |

### Questions (4 per dimension = 24 total)

Each question has 5 options scored 1-5 (low to high maturity).

**Dimension 1: Tracking**
- Q1: Website/app tracking setup
- Q2: Tag governance
- Q3: Behaviors tracked
- Q4: Touchpoint linking

**Dimension 2: Attribution**
- Q5: Attribution method
- Q6: Incrementality measurement
- Q7: Journey tracking
- Q8: Budget allocation

**Dimension 3: Reporting**
- Q9: Reporting cadence
- Q10: Dashboard scope
- Q11: Metric definitions
- Q12: Anomaly response

**Dimension 4: Experimentation**
- Q13: Test frequency
- Q14: Testing tools
- Q15: Decision use
- Q16: Beyond A/B testing

**Dimension 5: Lifecycle**
- Q17: Metrics beyond conversion
- Q18: Segmentation
- Q19: Retention tactics
- Q20: Strategy influence

**Dimension 6: Infrastructure**
- Q21: Data consolidation
- Q22: Sources integrated
- Q23: Data quality
- Q24: Infrastructure capabilities

---

## 3. Scoring System

### Dimension Score
```
dimension_score = average(4 question scores)
```

### Overall Score
```
base_overall = average(6 dimension scores)
```

### Weakest-Link Cap
If any dimension < 2.0, overall is capped:
```
capped_overall = min(base_overall, min_dimension + 1.5)
```

### Maturity Levels

| Level | Key | Score Range | Meaning |
|-------|-----|-------------|---------|
| 1 | `reactive` | 1.0 - 2.0 | Flying blind |
| 2 | `structured` | 2.0 - 2.5 | Foundation exists |
| 3 | `systematic` | 2.5 - 3.5 | Data-aware |
| 4 | `integrated` | 3.5 - 4.5 | Data-driven |
| 5 | `compounding` | 4.5 - 5.0 | Elite |

### Dimension Tiers

| Tier | Score Range |
|------|-------------|
| Low | 1.0 - 2.5 |
| Medium | 2.5 - 3.5 |
| High | 3.5 - 5.0 |

### Gap Analysis

- **Primary Gap**: Lowest-scoring dimension
- **Critical Gaps**: Dimensions > 1.5 points below overall
- **Foundation Gaps**: Any dimension < 2.0

### CTA Tone

| Tone | Condition |
|------|-----------|
| Hot | 2+ foundation gaps |
| Warm | 1 foundation gap OR any critical gaps |
| Cool | No foundation or critical gaps |

---

## 4. Data Flow to PDF

### Submit Payload
```json
{
  "email": "user@example.com",
  "company": "Acme Inc",
  "answers": [
    { "question_id": "q01_tracking_setup", "option_id": "q01_tracking_setup_o3" }
  ],
  "timings": [
    { "question_id": "q01_tracking_setup", "time_spent_ms": 5000 }
  ],
  "utm": { "source": "...", "medium": "...", "campaign": "..." }
}
```

### Stored in Database (quiz_takes)
```
token                 → unique result identifier
email                 → user email
company               → company name (nullable)
overall_score         → base score before cap
overall_score_capped  → final score after weakest-link
overall_level         → 1-5
dimension_scores      → { "tracking": 2.5, "attribution": 3.0, ... }
dimension_tiers       → { "tracking": "low", "attribution": "medium", ... }
primary_gap           → "tracking"
critical_gaps         → [{ "dimension_id": "tracking", "score": 1.5 }]
cta                   → { "intensity": "hot", "reason_codes": [...] }
```

### ResultsDTO (feeds Results page + PDF)
```typescript
{
  token: string;
  created_at: string;
  company: string | null;

  overall: {
    score: number;           // base
    score_capped: number;    // after cap
    level: {
      level: 1-5;
      key: string;
      name: string;
      hero_title: string;
      hero_copy: string;
    };
  };

  dimensions: [{
    dimension_id: string;
    name: string;
    score: number;
    tier: "low" | "medium" | "high";
    is_primary_gap: boolean;
    is_critical_gap: boolean;
  }];

  primary_gap: { dimension_id: string; score: number };
  critical_gaps: [{ dimension_id: string; score: number }];

  roadmap: [{              // Top 3 gaps
    dimension_id: string;
    tier: string;
    what_it_means: string;
    now: string[];         // Immediate actions
    next: string[];        // Short-term actions
    later: string[];       // Long-term actions
  }];

  cta: {
    intensity: "hot" | "warm" | "cool";
    reason_codes: string[];
  };
}
```

---

## 5. PDF Generation

### Route: `/api/pdf/[token]`

### Process
1. Validate token format (base62, 12-32 chars)
2. Check cache for existing PDF
3. If not cached: fetch ResultsDTO → generate PDF → cache
4. Return PDF with 24-hour cache header

### PDF Contents

**Header**
- Title: "MaxMin DTC Assessment Report"
- Company name (if provided)
- Generated date

**Overall Score Section**
- Score: "3.2 / 5.0"
- Level: "Level 3: Systematic"

**Dimension Scores Table**
For each of 6 dimensions:
- Name (e.g., "01 Tracking & Data Collection")
- Score (2 decimal places)
- Tier (Low/Medium/High)
- Flag if primary or critical gap

**Priority Roadmap**
Top 3 lowest-scoring dimensions:
- Dimension name + tier
- "What it means" description
- "Now" actions (immediate priorities)

**Footer**
- Results link: `{SITE_URL}/results/{token}`
- Branding: "maxmin.co"

### PDF Technical Details
- Library: `pdf-lib`
- Page size: A4 (595 x 842 points)
- Margins: 50pt
- Fonts: Helvetica, Helvetica Bold
- Auto page breaks on overflow

---

## 6. Files Reference

| Purpose | File |
|---------|------|
| Quiz page | `app/(assessment)/assessment/quiz/page.tsx` |
| Quiz client | `components/quiz/quiz-client.tsx` |
| Submit API | `app/api/assessment/submit/route.ts` |
| Submit logic | `lib/assessment/submitAssessment.ts` |
| Scoring engine | `lib/scoring.ts` |
| Results DTO | `lib/assessment/getResultsDto.ts` |
| PDF route | `app/api/pdf/[token]/route.ts` |
| PDF generator | `lib/pdf/generatePdf.ts` |
| Dimensions config | `config/dimensions.json` |
| Questions config | `config/questions.json` |
| Levels config | `config/levels.json` |
| Scoring rules | `config/scoring-rules.json` |
| Roadmap content | DB: `roadmap_modules` table |
