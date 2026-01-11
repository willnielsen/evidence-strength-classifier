import { StudyType, CausalMethod, ExtractedFeatures, RiskItem, Severity } from '../types.js';

/**
 * Threat definitions with conditions for when they apply
 */
interface ThreatDefinition {
  name: string;
  applicableTo: StudyType[] | 'all';
  excludedMethods?: CausalMethod[];
  checkSeverity: (features: ExtractedFeatures, studyType: StudyType) => Severity | null;
  reasoning: (features: ExtractedFeatures) => string;
}

const THREAT_DEFINITIONS: ThreatDefinition[] = [
  // Selection Bias
  {
    name: 'Selection bias',
    applicableTo: 'all',
    excludedMethods: ['randomization'],
    checkSeverity: (f, st) => {
      if (st === 'rct' || st === 'cluster_rct') return null;
      if (f.hasMatchingPSM && f.hasBalanceTests) return 'low';
      if (f.hasMatchingPSM) return 'medium';
      if (f.hasSelectionBiasDiscussion) return 'medium';
      return 'high';
    },
    reasoning: (f) => {
      if (f.hasMatchingPSM && f.hasBalanceTests) {
        return 'Matching with balance verification partially addresses selection, but unobserved confounding remains possible.';
      }
      if (f.hasMatchingPSM) {
        return 'Matching attempted but balance not clearly demonstrated.';
      }
      if (f.hasSelectionBiasDiscussion) {
        return 'Selection bias acknowledged but not fully addressed through design.';
      }
      return 'Non-random assignment without clear identification strategy raises selection concerns.';
    },
  },

  // Attrition Bias
  {
    name: 'Attrition bias',
    applicableTo: ['rct', 'cluster_rct', 'observational_cohort'],
    checkSeverity: (f) => {
      if (f.hasAttritionDiscussion && f.hasSensitivityAnalysis) return 'low';
      if (f.hasAttritionDiscussion) return 'medium';
      return 'medium';
    },
    reasoning: (f) => {
      if (f.hasAttritionDiscussion && f.hasSensitivityAnalysis) {
        return 'Attrition discussed with bounds/sensitivity analysis.';
      }
      if (f.hasAttritionDiscussion) {
        return 'Attrition mentioned but robustness to differential attrition unclear.';
      }
      return 'No discussion of attrition detected; potential for differential dropout.';
    },
  },

  // Parallel Trends Violation (DiD specific)
  {
    name: 'Parallel trends violation',
    applicableTo: ['quasi_experimental_did', 'quasi_experimental_event_study'],
    checkSeverity: (f) => {
      if (f.hasParallelTrends && f.hasEventStudy) return 'low';
      if (f.hasParallelTrends) return 'low';
      return 'high';
    },
    reasoning: (f) => {
      if (f.hasParallelTrends && f.hasEventStudy) {
        return 'Parallel trends tested with event study showing pre-trends.';
      }
      if (f.hasParallelTrends) {
        return 'Parallel trends assumption discussed/tested.';
      }
      return 'No evidence of parallel trends testing; key identification assumption untested.';
    },
  },

  // Weak Instruments (IV specific)
  {
    name: 'Weak instruments',
    applicableTo: ['quasi_experimental_iv'],
    checkSeverity: (f) => {
      if (f.hasRobustnessChecks) return 'medium';
      return 'high';
    },
    reasoning: (f) => {
      if (f.hasRobustnessChecks) {
        return 'Some instrument strength diagnostics may be present.';
      }
      return 'Instrument strength not clearly demonstrated; risk of weak instrument bias.';
    },
  },

  // Exclusion Restriction (IV specific)
  {
    name: 'Exclusion restriction violation',
    applicableTo: ['quasi_experimental_iv'],
    checkSeverity: () => 'medium',
    reasoning: () =>
      'Exclusion restriction is inherently untestable; relies on theoretical argument.',
  },

  // Manipulation (RDD specific)
  {
    name: 'Running variable manipulation',
    applicableTo: ['quasi_experimental_rdd'],
    checkSeverity: (f) => {
      if (f.hasSensitivityAnalysis || f.hasRobustnessChecks) return 'low';
      return 'medium';
    },
    reasoning: (f) => {
      if (f.hasSensitivityAnalysis || f.hasRobustnessChecks) {
        return 'Manipulation tests or density checks may be present.';
      }
      return 'No clear mention of manipulation tests; sorting around cutoff is a concern.';
    },
  },

  // Spillovers/SUTVA
  {
    name: 'Spillover/SUTVA violation',
    applicableTo: ['rct', 'cluster_rct', 'quasi_experimental_did'],
    checkSeverity: (f) => {
      if (f.hasSpilloverDiscussion) return 'low';
      return 'medium';
    },
    reasoning: (f) => {
      if (f.hasSpilloverDiscussion) {
        return 'Spillovers acknowledged and potentially addressed.';
      }
      return 'No discussion of spillovers; treatment effects may contaminate control group.';
    },
  },

  // Measurement Error
  {
    name: 'Measurement error',
    applicableTo: 'all',
    checkSeverity: (f) => {
      if (f.hasAdminData || f.hasObjectiveMeasures) return 'low';
      if (f.hasValidatedInstruments) return 'low';
      if (f.hasSelfReport) return 'medium';
      return 'medium';
    },
    reasoning: (f) => {
      if (f.hasAdminData || f.hasObjectiveMeasures) {
        return 'Objective/administrative measures reduce measurement concerns.';
      }
      if (f.hasValidatedInstruments) {
        return 'Validated instruments used for measurement.';
      }
      if (f.hasSelfReport) {
        return 'Self-reported outcomes subject to recall bias and social desirability.';
      }
      return 'Measurement approach unclear.';
    },
  },

  // Multiple Testing / p-hacking
  {
    name: 'Multiple hypothesis testing',
    applicableTo: 'all',
    checkSeverity: (f) => {
      if (f.hasPreRegistration) return 'low';
      if (f.hasRobustnessChecks) return 'medium';
      return 'medium';
    },
    reasoning: (f) => {
      if (f.hasPreRegistration) {
        return 'Pre-registration reduces risk of specification searching.';
      }
      if (f.hasRobustnessChecks) {
        return 'Multiple specifications shown, reducing cherry-picking concerns.';
      }
      return 'No pre-registration; potential for selective reporting.';
    },
  },

  // Publication Bias (for reviews)
  {
    name: 'Publication bias',
    applicableTo: ['systematic_review', 'meta_analysis'],
    checkSeverity: (f) => {
      if (f.hasSensitivityAnalysis) return 'low';
      return 'medium';
    },
    reasoning: (f) => {
      if (f.hasSensitivityAnalysis) {
        return 'Publication bias tests (funnel plot, Egger, etc.) may be present.';
      }
      return 'Meta-analyses vulnerable to publication bias; tests not clearly mentioned.';
    },
  },

  // External validity / generalizability
  {
    name: 'Limited generalizability',
    applicableTo: 'all',
    checkSeverity: (f) => {
      if (f.hasExternalValidityDiscussion) return 'low';
      if (f.sampleSizeNumeric && f.sampleSizeNumeric > 10000) return 'low';
      return 'medium';
    },
    reasoning: (f) => {
      if (f.hasExternalValidityDiscussion) {
        return 'External validity explicitly discussed.';
      }
      if (f.sampleSizeNumeric && f.sampleSizeNumeric > 10000) {
        return 'Large sample may improve representativeness.';
      }
      return 'Generalizability to other contexts unclear.';
    },
  },

  // Unobserved Confounding
  {
    name: 'Unobserved confounding',
    applicableTo: [
      'observational_cohort',
      'observational_cross_sectional',
      'observational_case_control',
      'quasi_experimental_matching',
    ],
    checkSeverity: (f) => {
      if (f.hasSensitivityAnalysis) return 'medium';
      return 'high';
    },
    reasoning: (f) => {
      if (f.hasSensitivityAnalysis) {
        return 'Sensitivity analysis to unobservables conducted (e.g., Oster, Rosenbaum bounds).';
      }
      return 'Observational design cannot rule out unobserved confounders.';
    },
  },
];

/**
 * Identify internal validity risks based on study type, method, and features
 */
export function identifyThreats(
  studyType: StudyType,
  method: CausalMethod,
  features: ExtractedFeatures
): RiskItem[] {
  const risks: RiskItem[] = [];

  for (const threat of THREAT_DEFINITIONS) {
    // Check if threat applies to this study type
    const appliesToStudy =
      threat.applicableTo === 'all' ||
      threat.applicableTo.includes(studyType);

    if (!appliesToStudy) continue;

    // Check if method is excluded
    if (threat.excludedMethods?.includes(method)) continue;

    // Evaluate severity
    const severity = threat.checkSeverity(features, studyType);
    if (severity === null) continue;

    risks.push({
      risk: threat.name,
      severity,
      reasoning: threat.reasoning(features),
    });
  }

  // Sort by severity (high first)
  const severityOrder: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  risks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return risks;
}

/**
 * Generate follow-up questions based on identified threats and missing info
 */
export function generateFollowUpQuestions(
  studyType: StudyType,
  method: CausalMethod,
  features: ExtractedFeatures,
  risks: RiskItem[]
): string[] {
  const questions: string[] = [];

  // Sample size
  if (features.sampleSizeNumeric === null) {
    questions.push('What is the sample size?');
  }

  // Method-specific questions
  if (method === 'difference_in_differences' && !features.hasParallelTrends) {
    questions.push('Is there evidence supporting the parallel trends assumption?');
  }

  if (method === 'instrumental_variables') {
    questions.push('What is the first-stage F-statistic for instrument strength?');
    questions.push('What is the theoretical argument for the exclusion restriction?');
  }

  if (method === 'regression_discontinuity' && !features.hasSensitivityAnalysis) {
    questions.push('Were manipulation/McCrary tests conducted?');
    questions.push('How sensitive are results to bandwidth choice?');
  }

  if (method === 'randomization' && !features.hasAttritionDiscussion) {
    questions.push('What was the attrition rate and was it differential?');
  }

  // Quality questions
  if (!features.hasPreRegistration) {
    questions.push('Was the analysis pre-registered?');
  }

  if (!features.hasRobustnessChecks) {
    questions.push('Were robustness checks or alternative specifications explored?');
  }

  // High severity risks
  const highRisks = risks.filter((r) => r.severity === 'high');
  if (highRisks.length > 0) {
    questions.push(
      `How does the study address: ${highRisks.map((r) => r.risk.toLowerCase()).join(', ')}?`
    );
  }

  // External validity
  if (!features.hasExternalValidityDiscussion) {
    questions.push('What population/context do these results generalize to?');
  }

  return questions.slice(0, 5); // Limit to 5 most important
}
