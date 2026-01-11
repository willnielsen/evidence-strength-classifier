# Evidence Strength Classifier

A CLI tool that classifies the evidence quality of research studies using best practices from causal inference and impact evaluation.

## Features

- **Study type detection**: Identifies RCTs, difference-in-differences, instrumental variables, regression discontinuity, matching, synthetic control, observational studies, and systematic reviews/meta-analyses
- **Causal strength scoring**: Method-specific rubrics assess internal validity
- **Risk identification**: Detects threats like selection bias, attrition, parallel trends violations, weak instruments, etc.
- **Comprehensive output**: JSON with scores for causal strength, external validity, measurement quality, and transparency
- **Human-readable summary**: Visual summary with grade, scores, and recommendations

## Installation

```bash
cd evidence-strength-classifier
npm install
npm run build
```

## Usage

### From file
```bash
node dist/index.js --file examples/rct-abstract.txt
```

### From text
```bash
node dist/index.js --text "We conducted a randomized controlled trial..."
```

### From stdin
```bash
cat examples/did-abstract.txt | node dist/index.js
```

### Output options
```bash
# JSON only (for piping to other tools)
node dist/index.js --file study.txt --json-only

# Summary only (human readable)
node dist/index.js --file study.txt --summary-only

# Pretty-printed JSON
node dist/index.js --file study.txt --json-only --pretty
```

## Example Output

### Input (RCT abstract)
```
We randomly assigned 1,200 children to receive either a fortified supplement
(n=600) or placebo (n=600) for 12 months. Balance tests confirmed successful
randomization. Pre-registered with ISRCTN12345678...
```

### Summary Output
```
═══════════════════════════════════════════════════════════════
                    EVIDENCE STRENGTH CLASSIFICATION
═══════════════════════════════════════════════════════════════

  OVERALL GRADE: STRONG
  Confidence: 72%

───────────────────────────────────────────────────────────────
  METHODOLOGY
───────────────────────────────────────────────────────────────
  Study Type: Randomized Controlled Trial (RCT)
  Causal Method: randomization
  Indicators Found: randomization mentioned, control group, placebo/sham
  Sample: N = 1,200

───────────────────────────────────────────────────────────────
  SCORES (0-5 scale)
───────────────────────────────────────────────────────────────
  Causal Strength:    4.9 [█████]
  External Validity:  3.0 [███░░]
  Measurement:        2.5 [███░░]
  Transparency:       3.0 [███░░]

───────────────────────────────────────────────────────────────
  KEY VALIDITY RISKS
───────────────────────────────────────────────────────────────
  ○ [MEDIUM] Attrition bias
  ○ [MEDIUM] Spillover/SUTVA violation

───────────────────────────────────────────────────────────────
  RECOMMENDED USE
───────────────────────────────────────────────────────────────
  Good basis for directional conclusions. Quantitative estimates
  should be treated with some caution.

═══════════════════════════════════════════════════════════════
  Automated heuristic classification. Not a substitute for full
  critical appraisal by domain experts.
═══════════════════════════════════════════════════════════════
```

### JSON Output
```json
{
  "study_type": "rct",
  "causal_method": "randomization",
  "causal_method_indicators": ["randomization mentioned", "control group", "placebo/sham"],
  "causal_strength": 4.9,
  "causal_strength_justification": "Base strength for randomization: 4.5/5. Modifiers applied: +0.2: Balance tests reported; +0.2: Pre-registered.",
  "internal_validity_risks": [
    {"risk": "Attrition bias", "severity": "medium", "reasoning": "Attrition mentioned but robustness to differential attrition unclear."}
  ],
  "external_validity": 3.0,
  "external_validity_notes": "Moderate sample size",
  "measurement_quality": 2.5,
  "measurement_quality_notes": "Measurement approach unclear from abstract",
  "sample_size_info": "N = 1,200",
  "transparency_reproducibility": 3.0,
  "transparency_signals": ["Pre-registered", "Robustness checks reported"],
  "overall_evidence_grade": "Strong",
  "confidence": 0.72,
  "recommended_use": "Good basis for directional conclusions. Quantitative estimates should be treated with some caution.",
  "follow_up_questions": ["What was the attrition rate and was it differential?"],
  "disclaimer": "Automated heuristic classification..."
}
```

## Evidence Grading Rubric

### Study Type Hierarchy (baseline causal strength)
| Study Type | Baseline | Key Requirements |
|------------|----------|------------------|
| RCT | 4.5 | Randomization, control group |
| Regression Discontinuity | 4.0 | Clear cutoff, manipulation tests |
| Difference-in-Differences | 3.5 | Parallel trends, fixed effects |
| Synthetic Control | 3.5 | Good pre-fit, donor pool |
| Instrumental Variables | 3.0 | First-stage strength, exclusion argument |
| Matching/PSM | 2.5 | Balance achieved, overlap |
| Fixed Effects | 2.0 | Within-variation |
| Observational | 1.5 | Rich controls |

### Score Modifiers
Scores are adjusted based on detected features:
- Pre-registration: +0.2 to +1.0
- Robustness checks: +0.3 to +0.5
- Balance tests: +0.2 to +0.4
- Sensitivity analysis: +0.2 to +0.4
- Small sample (<100): -0.5 to -1.0
- Missing key validity checks: -0.5 to -1.0

### Overall Grade
| Grade | Weighted Score | Interpretation |
|-------|---------------|----------------|
| Very Strong | ≥4.2 | Suitable for quantitative decision-making |
| Strong | ≥3.4 | Good for directional conclusions |
| Moderate | ≥2.5 | Useful with triangulation |
| Weak | ≥1.5 | Exploratory only |
| Very Weak | <1.5 | Hypothesis-generating only |

## Running Tests

```bash
npm test
```

Tests cover:
- RCT classification
- Difference-in-differences classification
- Instrumental variables classification
- Observational cohort classification
- Systematic review/meta-analysis classification
- Regression discontinuity classification
- Output structure validation
- Determinism (same input → same output)

## Project Structure

```
evidence-strength-classifier/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── classifier.ts         # Main classification orchestrator
│   ├── types.ts              # TypeScript interfaces
│   └── rubric/
│       ├── featureExtractor.ts  # Text → features
│       ├── studyTypes.ts        # Study type detection
│       ├── causalMethods.ts     # Method-specific scoring
│       ├── threats.ts           # Risk identification
│       └── scoring.ts           # Grade calculation
├── tests/
│   └── classifier.test.ts    # Unit tests
├── examples/
│   ├── rct-abstract.txt
│   └── did-abstract.txt
└── README.md
```

## Limitations

- Classification is based on keyword detection from text; it cannot verify claims
- Abstracts contain limited information compared to full papers
- The rubric encodes general best practices but domain-specific considerations may apply
- Confidence scores reflect information availability, not classification accuracy
- This is an automated heuristic, not a substitute for expert critical appraisal

## License

MIT
