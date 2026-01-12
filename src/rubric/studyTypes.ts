import { StudyType, CausalMethod, ExtractedFeatures } from '../types.js';

/**
 * Study type detection priority order (higher priority first)
 * Detection is based on extracted features from text
 */
interface StudyTypeRule {
  type: StudyType;
  priority: number;
  check: (features: ExtractedFeatures) => boolean;
}

const STUDY_TYPE_RULES: StudyTypeRule[] = [
  // Meta-analysis (highest priority for reviews)
  {
    type: 'meta_analysis',
    priority: 100,
    check: (f) => f.isMetaAnalysis,
  },
  // Systematic review
  {
    type: 'systematic_review',
    priority: 95,
    check: (f) => f.isSystematicReview && !f.isMetaAnalysis,
  },
  // RCT (check for cluster RCT first)
  // Exclude when explicit quasi-experimental methods are mentioned (IV, RDD, DiD, synthetic control)
  {
    type: 'cluster_rct',
    priority: 90,
    check: (f) =>
      f.hasRandomization &&
      f.hasControlGroup &&
      f.hasClusterDesign &&
      !f.hasInstrumentalVariable &&
      !f.hasRegressionDiscontinuity &&
      !f.hasDifferenceInDifferences &&
      !f.hasSyntheticControl,
  },
  {
    type: 'rct',
    priority: 85,
    check: (f) =>
      f.hasRandomization &&
      (f.hasControlGroup || f.hasPlacebo) &&
      !f.hasInstrumentalVariable &&
      !f.hasRegressionDiscontinuity &&
      !f.hasDifferenceInDifferences &&
      !f.hasSyntheticControl,
  },
  // Quasi-experimental methods (check specific ones first)
  {
    type: 'quasi_experimental_synthetic_control',
    priority: 80,
    check: (f) => f.hasSyntheticControl,
  },
  {
    type: 'quasi_experimental_rdd',
    priority: 75,
    check: (f) => f.hasRegressionDiscontinuity,
  },
  {
    type: 'quasi_experimental_iv',
    priority: 70,
    check: (f) => f.hasInstrumentalVariable,
  },
  {
    type: 'quasi_experimental_event_study',
    priority: 65,
    check: (f) => f.hasEventStudy && !f.hasDifferenceInDifferences,
  },
  {
    type: 'quasi_experimental_did',
    priority: 60,
    check: (f) => f.hasDifferenceInDifferences || (f.hasFixedEffects && f.hasParallelTrends),
  },
  {
    type: 'quasi_experimental_matching',
    priority: 55,
    check: (f) => f.hasMatchingPSM && !f.hasRandomization,
  },
  // Observational studies
  {
    type: 'observational_cohort',
    priority: 40,
    check: (f) =>
      f.hasBaseline &&
      !f.hasRandomization &&
      !f.hasDifferenceInDifferences &&
      !f.hasInstrumentalVariable &&
      !f.hasRegressionDiscontinuity,
  },
  {
    type: 'observational_cross_sectional',
    priority: 30,
    check: (f) =>
      !f.hasRandomization &&
      !f.hasDifferenceInDifferences &&
      !f.hasInstrumentalVariable &&
      !f.hasRegressionDiscontinuity &&
      !f.hasBaseline &&
      (f.sampleSizeNumeric !== null || f.hasSelfReport),
  },
];

/**
 * Detect the study type from extracted features
 */
export function detectStudyType(features: ExtractedFeatures): StudyType {
  // Sort rules by priority (descending) and find first match
  const sortedRules = [...STUDY_TYPE_RULES].sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    if (rule.check(features)) {
      return rule.type;
    }
  }

  return 'unknown';
}

/**
 * Detect the primary causal method used
 */
export function detectCausalMethod(features: ExtractedFeatures, studyType: StudyType): CausalMethod {
  // Map study types to causal methods
  const methodMap: Partial<Record<StudyType, CausalMethod>> = {
    rct: 'randomization',
    cluster_rct: 'randomization',
    quasi_experimental_did: 'difference_in_differences',
    quasi_experimental_rdd: 'regression_discontinuity',
    quasi_experimental_iv: 'instrumental_variables',
    quasi_experimental_matching: 'propensity_score_matching',
    quasi_experimental_synthetic_control: 'synthetic_control',
    quasi_experimental_event_study: 'event_study',
    meta_analysis: 'meta_analytic',
    systematic_review: 'meta_analytic',
  };

  if (methodMap[studyType]) {
    return methodMap[studyType]!;
  }

  // For observational studies, check if any causal method is mentioned
  if (features.hasFixedEffects) return 'fixed_effects';
  if (features.hasMatchingPSM) return 'propensity_score_matching';

  // Pure observational
  if (
    studyType === 'observational_cohort' ||
    studyType === 'observational_cross_sectional' ||
    studyType === 'observational_case_control'
  ) {
    return 'selection_on_observables';
  }

  return 'unknown';
}

/**
 * Get causal method indicators that were found in the text
 */
export function getCausalMethodIndicators(features: ExtractedFeatures): string[] {
  const indicators: string[] = [];

  if (features.hasRandomization) indicators.push('randomization mentioned');
  if (features.hasControlGroup) indicators.push('control group');
  if (features.hasPlacebo) indicators.push('placebo/sham');
  if (features.hasBlinding) indicators.push('blinding');
  if (features.hasDifferenceInDifferences) indicators.push('difference-in-differences');
  if (features.hasParallelTrends) indicators.push('parallel trends');
  if (features.hasFixedEffects) indicators.push('fixed effects');
  if (features.hasInstrumentalVariable) indicators.push('instrumental variable');
  if (features.hasRegressionDiscontinuity) indicators.push('regression discontinuity');
  if (features.hasMatchingPSM) indicators.push('matching/PSM');
  if (features.hasSyntheticControl) indicators.push('synthetic control');
  if (features.hasEventStudy) indicators.push('event study');

  return indicators;
}

/**
 * Get human-readable study type label
 */
export function getStudyTypeLabel(studyType: StudyType): string {
  const labels: Record<StudyType, string> = {
    rct: 'Randomized Controlled Trial (RCT)',
    cluster_rct: 'Cluster Randomized Controlled Trial',
    quasi_experimental_did: 'Quasi-Experimental (Difference-in-Differences)',
    quasi_experimental_rdd: 'Quasi-Experimental (Regression Discontinuity)',
    quasi_experimental_iv: 'Quasi-Experimental (Instrumental Variables)',
    quasi_experimental_matching: 'Quasi-Experimental (Matching/PSM)',
    quasi_experimental_synthetic_control: 'Quasi-Experimental (Synthetic Control)',
    quasi_experimental_event_study: 'Quasi-Experimental (Event Study)',
    observational_cross_sectional: 'Observational (Cross-Sectional)',
    observational_cohort: 'Observational (Cohort)',
    observational_case_control: 'Observational (Case-Control)',
    qualitative: 'Qualitative',
    mixed_methods: 'Mixed Methods',
    modeling_simulation: 'Modeling/Simulation',
    systematic_review: 'Systematic Review',
    meta_analysis: 'Meta-Analysis',
    unknown: 'Unknown/Unclear',
  };

  return labels[studyType];
}
