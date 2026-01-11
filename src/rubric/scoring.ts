import { ExtractedFeatures, EvidenceGrade, RiskItem, Severity } from '../types.js';

/**
 * Calculate external validity score (0-5)
 */
export function calculateExternalValidity(features: ExtractedFeatures): {
  score: number;
  notes: string;
} {
  let score = 2.5; // Baseline
  const notes: string[] = [];

  // Large sample improves generalizability
  if (features.sampleSizeNumeric !== null) {
    if (features.sampleSizeNumeric >= 10000) {
      score += 1.0;
      notes.push('Large sample size');
    } else if (features.sampleSizeNumeric >= 1000) {
      score += 0.5;
      notes.push('Moderate sample size');
    } else if (features.sampleSizeNumeric < 100) {
      score -= 0.5;
      notes.push('Small sample limits generalizability');
    }
  } else {
    notes.push('Sample size unknown');
  }

  // External validity discussion
  if (features.hasExternalValidityDiscussion) {
    score += 0.5;
    notes.push('External validity explicitly discussed');
  }

  // Meta-analysis/systematic review typically more generalizable
  if (features.isMetaAnalysis || features.isSystematicReview) {
    score += 0.5;
    notes.push('Review synthesizes multiple studies/contexts');
  }

  // Clamp and round
  score = Math.max(0, Math.min(5, score));
  score = Math.round(score * 10) / 10;

  return {
    score,
    notes: notes.length > 0 ? notes.join('; ') : 'Limited information on generalizability',
  };
}

/**
 * Calculate measurement quality score (0-5)
 */
export function calculateMeasurementQuality(features: ExtractedFeatures): {
  score: number;
  notes: string;
} {
  let score = 2.5; // Baseline
  const notes: string[] = [];

  // Objective measures are best
  if (features.hasAdminData) {
    score += 1.0;
    notes.push('Administrative/registry data');
  }

  if (features.hasObjectiveMeasures) {
    score += 0.75;
    notes.push('Objective measures');
  }

  if (features.hasValidatedInstruments) {
    score += 0.5;
    notes.push('Validated instruments');
  }

  // Self-report is weaker
  if (features.hasSelfReport && !features.hasObjectiveMeasures && !features.hasAdminData) {
    score -= 0.5;
    notes.push('Relies on self-report');
  }

  // If nothing mentioned, uncertain
  if (
    !features.hasAdminData &&
    !features.hasObjectiveMeasures &&
    !features.hasValidatedInstruments &&
    !features.hasSelfReport
  ) {
    notes.push('Measurement approach unclear from abstract');
  }

  // Clamp and round
  score = Math.max(0, Math.min(5, score));
  score = Math.round(score * 10) / 10;

  return {
    score,
    notes: notes.length > 0 ? notes.join('; ') : 'Measurement quality unclear',
  };
}

/**
 * Calculate transparency/reproducibility score (0-5)
 */
export function calculateTransparency(features: ExtractedFeatures): {
  score: number;
  signals: string[];
} {
  let score = 1.5; // Baseline (abstracts rarely have full info)
  const signals: string[] = [];

  if (features.hasPreRegistration) {
    score += 1.0;
    signals.push('Pre-registered');
  }

  if (features.hasDataAvailability) {
    score += 0.75;
    signals.push('Data available');
  }

  if (features.hasCodeAvailability) {
    score += 0.5;
    signals.push('Code available');
  }

  if (features.hasCONSORT) {
    score += 0.5;
    signals.push('CONSORT reporting');
  }

  if (features.hasPRISMA) {
    score += 0.5;
    signals.push('PRISMA guidelines');
  }

  if (features.hasRobustnessChecks) {
    score += 0.5;
    signals.push('Robustness checks reported');
  }

  if (features.hasSensitivityAnalysis) {
    score += 0.25;
    signals.push('Sensitivity analysis');
  }

  // Clamp and round
  score = Math.max(0, Math.min(5, score));
  score = Math.round(score * 10) / 10;

  return {
    score,
    signals: signals.length > 0 ? signals : ['No transparency signals detected'],
  };
}

/**
 * Calculate overall evidence grade based on component scores
 */
export function calculateOverallGrade(
  causalStrength: number,
  internalValidityRisks: RiskItem[],
  externalValidity: number,
  measurementQuality: number,
  transparency: number
): EvidenceGrade {
  // Weight the components
  const weights = {
    causal: 0.40,
    internal: 0.25,
    external: 0.15,
    measurement: 0.10,
    transparency: 0.10,
  };

  // Convert internal validity risks to a score (fewer high risks = higher score)
  const highRisks = internalValidityRisks.filter((r) => r.severity === 'high').length;
  const medRisks = internalValidityRisks.filter((r) => r.severity === 'medium').length;
  let internalScore = 5 - highRisks * 1.5 - medRisks * 0.5;
  internalScore = Math.max(0, Math.min(5, internalScore));

  // Calculate weighted average
  const weightedScore =
    causalStrength * weights.causal +
    internalScore * weights.internal +
    externalValidity * weights.external +
    measurementQuality * weights.measurement +
    transparency * weights.transparency;

  // Map to grade
  if (weightedScore >= 4.2) return 'Very Strong';
  if (weightedScore >= 3.4) return 'Strong';
  if (weightedScore >= 2.5) return 'Moderate';
  if (weightedScore >= 1.5) return 'Weak';
  return 'Very Weak';
}

/**
 * Calculate confidence in the classification (0-1)
 * Based on how much information was available in the text
 */
export function calculateConfidence(features: ExtractedFeatures): number {
  let confidence = 0.3; // Baseline for any text

  // More matched keywords = more information
  const keywordCount = features.matchedKeywords.length;
  confidence += Math.min(0.3, keywordCount * 0.03);

  // Sample size mentioned
  if (features.sampleSizeNumeric !== null) {
    confidence += 0.1;
  }

  // Clear methodology mentioned
  if (
    features.hasRandomization ||
    features.hasDifferenceInDifferences ||
    features.hasInstrumentalVariable ||
    features.hasRegressionDiscontinuity ||
    features.isMetaAnalysis
  ) {
    confidence += 0.15;
  }

  // Quality indicators
  if (features.hasRobustnessChecks) confidence += 0.05;
  if (features.hasPreRegistration) confidence += 0.05;
  if (features.hasBalanceTests) confidence += 0.05;

  // Clamp to 0-1
  return Math.min(1, Math.round(confidence * 100) / 100);
}

/**
 * Generate recommended use guidance based on grade
 */
export function generateRecommendedUse(
  grade: EvidenceGrade,
  causalStrength: number,
  highRiskCount: number
): string {
  if (grade === 'Very Strong') {
    return 'Suitable for quantitative decision-making and policy. High confidence in causal claims.';
  }

  if (grade === 'Strong') {
    return 'Good basis for directional conclusions. Quantitative estimates should be treated with some caution.';
  }

  if (grade === 'Moderate') {
    if (causalStrength >= 3) {
      return 'Useful for directional insight. Recommend triangulation with other evidence before quantification.';
    }
    return 'Provides suggestive evidence. Should be combined with other studies before drawing conclusions.';
  }

  if (grade === 'Weak') {
    return 'Exploratory or hypothesis-generating only. Not suitable for causal claims or quantification without substantial additional evidence.';
  }

  return 'Very limited evidentiary value. Useful only for generating hypotheses. Do not use for decision-making.';
}

/**
 * Get sample size info string
 */
export function getSampleSizeInfo(features: ExtractedFeatures): string {
  if (features.sampleSizeNumeric !== null) {
    return `N = ${features.sampleSizeNumeric.toLocaleString()}${
      features.sampleSizeText ? ` (from: "${features.sampleSizeText}")` : ''
    }`;
  }

  if (features.studyCountText) {
    return `Review of ${features.studyCountText}`;
  }

  return 'Sample size not detected in text';
}
