// Study type enumeration
export type StudyType =
  | 'rct'
  | 'cluster_rct'
  | 'quasi_experimental_did'
  | 'quasi_experimental_rdd'
  | 'quasi_experimental_iv'
  | 'quasi_experimental_matching'
  | 'quasi_experimental_synthetic_control'
  | 'quasi_experimental_event_study'
  | 'observational_cross_sectional'
  | 'observational_cohort'
  | 'observational_case_control'
  | 'qualitative'
  | 'mixed_methods'
  | 'modeling_simulation'
  | 'systematic_review'
  | 'meta_analysis'
  | 'unknown';

// Causal method enumeration
export type CausalMethod =
  | 'randomization'
  | 'difference_in_differences'
  | 'regression_discontinuity'
  | 'instrumental_variables'
  | 'propensity_score_matching'
  | 'synthetic_control'
  | 'event_study'
  | 'fixed_effects'
  | 'selection_on_observables'
  | 'meta_analytic'
  | 'none'
  | 'unknown';

// Severity levels for risks
export type Severity = 'low' | 'medium' | 'high';

// Evidence grade
export type EvidenceGrade = 'Very Strong' | 'Strong' | 'Moderate' | 'Weak' | 'Very Weak';

// Extracted features from text
export interface ExtractedFeatures {
  // Study design indicators
  hasRandomization: boolean;
  hasPlacebo: boolean;
  hasControlGroup: boolean;
  hasBlinding: boolean;
  hasBaseline: boolean;

  // Quasi-experimental indicators
  hasDifferenceInDifferences: boolean;
  hasParallelTrends: boolean;
  hasFixedEffects: boolean;
  hasInstrumentalVariable: boolean;
  hasRegressionDiscontinuity: boolean;
  hasMatchingPSM: boolean;
  hasSyntheticControl: boolean;
  hasEventStudy: boolean;

  // Quality indicators
  hasPowerCalculation: boolean;
  hasPreRegistration: boolean;
  hasRobustnessChecks: boolean;
  hasBalanceTests: boolean;
  hasSensitivityAnalysis: boolean;
  hasCONSORT: boolean;
  hasPRISMA: boolean;
  hasDataAvailability: boolean;
  hasCodeAvailability: boolean;

  // Sample information
  sampleSizeText: string | null;
  sampleSizeNumeric: number | null;

  // Validity indicators
  hasAttritionDiscussion: boolean;
  hasSpilloverDiscussion: boolean;
  hasSelectionBiasDiscussion: boolean;
  hasExternalValidityDiscussion: boolean;

  // Review/meta indicators
  isSystematicReview: boolean;
  isMetaAnalysis: boolean;
  studyCountText: string | null;

  // Measurement indicators
  hasValidatedInstruments: boolean;
  hasAdminData: boolean;
  hasSelfReport: boolean;
  hasObjectiveMeasures: boolean;

  // Raw keyword matches for transparency
  matchedKeywords: string[];
}

// Risk item in the output
export interface RiskItem {
  risk: string;
  severity: Severity;
  reasoning: string;
}

// Main classification output
export interface ClassificationResult {
  study_type: StudyType;
  causal_method: CausalMethod;
  causal_method_indicators: string[];
  causal_strength: number; // 0-5
  causal_strength_justification: string;
  internal_validity_risks: RiskItem[];
  external_validity: number; // 0-5
  external_validity_notes: string;
  measurement_quality: number; // 0-5
  measurement_quality_notes: string;
  sample_size_info: string;
  transparency_reproducibility: number; // 0-5
  transparency_signals: string[];
  overall_evidence_grade: EvidenceGrade;
  confidence: number; // 0-1
  recommended_use: string;
  follow_up_questions: string[];
  disclaimer: string;
}

// Rubric weights for different study types
export interface MethodologyRubric {
  studyType: StudyType;
  baselineCausalStrength: number;
  requiredChecks: string[];
  commonThreats: string[];
  strengthModifiers: {
    indicator: keyof ExtractedFeatures;
    modifier: number;
    condition?: 'present' | 'absent';
  }[];
}
