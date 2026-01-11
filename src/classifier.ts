import { ClassificationResult, ExtractedFeatures } from './types.js';
import { extractFeatures } from './rubric/featureExtractor.js';
import {
  detectStudyType,
  detectCausalMethod,
  getCausalMethodIndicators,
  getStudyTypeLabel,
} from './rubric/studyTypes.js';
import { assessCausalStrength } from './rubric/causalMethods.js';
import { identifyThreats, generateFollowUpQuestions } from './rubric/threats.js';
import {
  calculateExternalValidity,
  calculateMeasurementQuality,
  calculateTransparency,
  calculateOverallGrade,
  calculateConfidence,
  generateRecommendedUse,
  getSampleSizeInfo,
} from './rubric/scoring.js';

const DISCLAIMER =
  'Automated heuristic classification based on text analysis. Not a substitute for full critical appraisal by domain experts. Does not constitute medical, legal, or policy advice.';

/**
 * Main classification function
 * Takes study text and returns structured classification result
 */
export function classifyEvidence(text: string): ClassificationResult {
  // Step 1: Extract features from text
  const features = extractFeatures(text);

  // Step 2: Detect study type
  const studyType = detectStudyType(features);

  // Step 3: Detect causal method
  const causalMethod = detectCausalMethod(features, studyType);
  const causalMethodIndicators = getCausalMethodIndicators(features);

  // Step 4: Assess causal strength
  const causalAssessment = assessCausalStrength(causalMethod, features);

  // Step 5: Identify internal validity risks
  const internalValidityRisks = identifyThreats(studyType, causalMethod, features);

  // Step 6: Calculate other scores
  const externalValidityResult = calculateExternalValidity(features);
  const measurementResult = calculateMeasurementQuality(features);
  const transparencyResult = calculateTransparency(features);

  // Step 7: Calculate overall grade
  const overallGrade = calculateOverallGrade(
    causalAssessment.score,
    internalValidityRisks,
    externalValidityResult.score,
    measurementResult.score,
    transparencyResult.score
  );

  // Step 8: Calculate confidence
  const confidence = calculateConfidence(features);

  // Step 9: Generate recommended use
  const highRiskCount = internalValidityRisks.filter((r) => r.severity === 'high').length;
  const recommendedUse = generateRecommendedUse(overallGrade, causalAssessment.score, highRiskCount);

  // Step 10: Generate follow-up questions
  const followUpQuestions = generateFollowUpQuestions(
    studyType,
    causalMethod,
    features,
    internalValidityRisks
  );

  // Step 11: Get sample size info
  const sampleSizeInfo = getSampleSizeInfo(features);

  return {
    study_type: studyType,
    causal_method: causalMethod,
    causal_method_indicators: causalMethodIndicators,
    causal_strength: causalAssessment.score,
    causal_strength_justification: causalAssessment.justification,
    internal_validity_risks: internalValidityRisks,
    external_validity: externalValidityResult.score,
    external_validity_notes: externalValidityResult.notes,
    measurement_quality: measurementResult.score,
    measurement_quality_notes: measurementResult.notes,
    sample_size_info: sampleSizeInfo,
    transparency_reproducibility: transparencyResult.score,
    transparency_signals: transparencyResult.signals,
    overall_evidence_grade: overallGrade,
    confidence,
    recommended_use: recommendedUse,
    follow_up_questions: followUpQuestions,
    disclaimer: DISCLAIMER,
  };
}

/**
 * Generate human-readable summary from classification result
 */
export function generateSummary(result: ClassificationResult): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                    EVIDENCE STRENGTH CLASSIFICATION');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  // Overall grade (prominent)
  lines.push(`  OVERALL GRADE: ${result.overall_evidence_grade.toUpperCase()}`);
  lines.push(`  Confidence: ${Math.round(result.confidence * 100)}%`);
  lines.push('');

  // Study type and method
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('  METHODOLOGY');
  lines.push('───────────────────────────────────────────────────────────────');
  const studyTypeLabel = getStudyTypeLabel(result.study_type);
  lines.push(`  Study Type: ${studyTypeLabel}`);
  lines.push(`  Causal Method: ${result.causal_method.replace(/_/g, ' ')}`);
  if (result.causal_method_indicators.length > 0) {
    lines.push(`  Indicators Found: ${result.causal_method_indicators.join(', ')}`);
  }
  lines.push(`  Sample: ${result.sample_size_info}`);
  lines.push('');

  // Scores
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('  SCORES (0-5 scale)');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push(`  Causal Strength:    ${result.causal_strength.toFixed(1)} ${getScoreBar(result.causal_strength)}`);
  lines.push(`  External Validity:  ${result.external_validity.toFixed(1)} ${getScoreBar(result.external_validity)}`);
  lines.push(`  Measurement:        ${result.measurement_quality.toFixed(1)} ${getScoreBar(result.measurement_quality)}`);
  lines.push(`  Transparency:       ${result.transparency_reproducibility.toFixed(1)} ${getScoreBar(result.transparency_reproducibility)}`);
  lines.push('');

  // Key risks
  if (result.internal_validity_risks.length > 0) {
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('  KEY VALIDITY RISKS');
    lines.push('───────────────────────────────────────────────────────────────');
    const topRisks = result.internal_validity_risks.slice(0, 4);
    for (const risk of topRisks) {
      const severityIcon = risk.severity === 'high' ? '⚠' : risk.severity === 'medium' ? '○' : '·';
      lines.push(`  ${severityIcon} [${risk.severity.toUpperCase()}] ${risk.risk}`);
    }
    lines.push('');
  }

  // Recommended use
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('  RECOMMENDED USE');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push(`  ${result.recommended_use}`);
  lines.push('');

  // Follow-up questions
  if (result.follow_up_questions.length > 0) {
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('  KEY QUESTIONS TO RESOLVE');
    lines.push('───────────────────────────────────────────────────────────────');
    for (const q of result.follow_up_questions.slice(0, 3)) {
      lines.push(`  • ${q}`);
    }
    lines.push('');
  }

  // Disclaimer
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push(`  ${result.disclaimer}`);
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Helper to create a visual score bar
 */
function getScoreBar(score: number): string {
  const filled = Math.round(score);
  const empty = 5 - filled;
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
}

/**
 * Export features for debugging/testing
 */
export function getExtractedFeatures(text: string): ExtractedFeatures {
  return extractFeatures(text);
}
