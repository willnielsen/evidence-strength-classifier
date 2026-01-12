import { ExtractedFeatures } from '../types.js';

// Keyword patterns for feature extraction
const PATTERNS = {
  // Randomization and RCT indicators
  randomization: /\b(random(ly|ized|isation|ization)?|rct|randomized controlled trial|randomised controlled trial|random assignment|random allocation|cluster.?random)/i,
  placebo: /\b(placebo|sham|dummy treatment)\b/i,
  controlGroup: /\b(control group|control arm|control condition|comparison group|waitlist control|treatment as usual|usual care|no.?treatment|compared to control|control\)|assigned to control|to control\b|(\d+)\s+to\s+control)\b/i,
  blinding: /\b(blind(ed|ing)?|double.?blind|single.?blind|triple.?blind|mask(ed|ing)?|concealed allocation)\b/i,
  baseline: /\b(baseline|pre.?treatment|pre.?intervention|before treatment)\b/i,
  clusterDesign: /\b(cluster.?random|cluster.?rct|cluster.?trial|group.?random|school.?random|village.?random|site.?random|community.?random|randomized.+(?:schools?|villages?|clusters?|communities|sites|clinics|hospitals))/i,

  // Difference-in-differences
  differenceInDifferences: /\b(difference.?in.?differences?|diff.?in.?diff|did\b|dd\s|staggered.?did|staggered.?diff|callaway.?sant.?anna|parallel.?trend|pre.?post.?design|before.?after.?comparison|treated.+cohorts?.+across)\b/i,
  parallelTrends: /\b(parallel.?trend|common.?trend|pre.?trend|flat.?pre|pre.?treatment.?trend|trend.?assumption|placebo.?test|falsification|event.?study.?framework)\b/i,
  fixedEffects: /\b(fixed.?effects?|entity.?fixed|time.?fixed|individual.?fixed|two.?way.?fixed|panel.?data|within.?estimator|county.?fixed|year.?fixed|quarter.?fixed)\b/i,

  // Instrumental variables
  instrumentalVariable: /\b(instrumental.?variables?|iv\s|2sls|two.?stage|tsls|instrument(s|ed)?|first.?stage|exclusion.?restriction|exogenous.?variation)\b/i,

  // Regression discontinuity - more specific patterns to avoid false positives
  regressionDiscontinuity: /\b(regression.?discontinuity|rdd\b|rd\sdesign|discontinuity.?design|running.?variable|sharp.?rd|fuzzy.?rd|mccrary|local.?linear|bandwidth.?sensitivity|calonico|cattaneo|discontinuity.?at)\b/i,

  // Matching
  matchingPSM: /\b(propensity.?score|psm|matching|matched.?sample|nearest.?neighbor|kernel.?matching|coarsened.?exact|cem|mahalanobis|caliper|overlap|common.?support)\b/i,

  // Synthetic control
  syntheticControl: /\b(synthetic.?control|scm|donor.?pool|counterfactual.?unit|pre.?treatment.?fit|abadie)\b/i,

  // Event study
  eventStudy: /\b(event.?study|event.?time|relative.?time|leads?.?and.?lags?|dynamic.?effects?|pre.?period|post.?period|staggered)\b/i,

  // Quality indicators
  powerCalculation: /\b(power.?calculation|power.?analysis|sample.?size.?calculation|minimum.?detectable.?effect|mde|statistical.?power)\b/i,
  preRegistration: /\b(pre.?register|preregister|registered.?report|prospective.?registration|trial.?registration|clinicaltrials\.gov|osf|aspredicted|isrctn|aegis)\b/i,
  robustnessChecks: /\b(robust(ness)?|sensitivity.?analysis|specification.?test|alternative.?specification|heterogeneity.?analysis|subgroup.?analysis|placebo.?regression|falsification)\b/i,
  balanceTests: /\b(balance.?tests?|balance.?table|covariate.?balance|baseline.?balance|t.?test|chi.?square.?test|standardized.?difference)\b/i,
  sensitivityAnalysis: /\b(sensitivity.?analysis|bounds.?analysis|lee.?bounds|manski.?bounds|rosenbaum.?bounds|oster|altonji|selection.?on.?unobservables)\b/i,
  CONSORT: /\b(consort|consolidated.?standards)\b/i,
  PRISMA: /\b(prisma|preferred.?reporting.?items)\b/i,
  dataAvailability: /\b(data.?available|data.?availability|replication.?data|open.?data|data.?repository|data.?access)\b/i,
  codeAvailability: /\b(code.?available|replication.?code|github|gitlab|code.?repository|reproducible)\b/i,

  // Validity discussions
  attrition: /\b(attrition|dropout|loss.?to.?follow.?up|missing.?data|non.?response|incomplete)\b/i,
  spillover: /\b(spillover|contamination|interference|sutva|displacement|general.?equilibrium)\b/i,
  selectionBias: /\b(selection.?bias|self.?selection|endogen(ous|eity)|omitted.?variable|unobserved.?confound|confound(er|ing)?)\b/i,
  externalValidity: /\b(external.?validity|generalizab|transport|extrapolat|heterogen(eous|eity)|site.?selection|external.?sample)\b/i,

  // Review/meta indicators
  systematicReview: /\b(systematic.?review|literature.?review|systematic.?search|inclusion.?criteria|exclusion.?criteria|search.?strategy|quality.?assessment)\b/i,
  metaAnalysis: /\b(meta.?analysis|pooled.?estimate|forest.?plot|heterogeneity.?test|i.?squared|publication.?bias|funnel.?plot|egger|random.?effects.?model|fixed.?effects.?model)\b/i,

  // Measurement
  validatedInstruments: /\b(validated.?instrument|validated.?scale|validated.?measure|psychometric|reliability|validity|cronbach|internal.?consistency)\b/i,
  adminData: /\b(administrative.?data|administrative.?records|admin.?data|registr(y|ies)|claims.?data|tax.?records|government.?records|linked.?data|hospital.?records|death.?registr|medical.?records|employment.?data|census|population.?census)\b/i,
  selfReport: /\b(self.?report|survey|questionnaire|interview|focus.?group)\b/i,
  objectiveMeasures: /\b(objective.?measure|biomarker|lab.?test|clinical.?assessment|direct.?observation|administrative.?outcome)\b/i,

  // Sample size extraction - supports "N=1000", "1,000 participants", "2.3 million unemployment spells"
  // Note: Decimals only allowed when followed by million/thousand to avoid matching years like "2022."
  sampleSize: /\b(?:n\s*=\s*(\d[\d,]*)\s*(million|thousand|k|m)?|sample(?:\s+size)?(?:\s+of)?\s+(\d[\d,]*)\s*(million|thousand|k|m)?|(\d[\d,\.]*)\s*(million|thousand)\s+\w*\s*(?:participants?|subjects?|patients?|individuals?|observations?|respondents?|households?|firms?|schools?|students?|children|adults|adolescents?|spells?|records?|person.?years?)|(\d[\d,]*)\s+(?:participants?|subjects?|patients?|individuals?|observations?|respondents?|households?|firms?|schools?|students?|children|adults|adolescents?|spells?|records?|person.?years?))\b/i,
  studyCount: /\b(\d+)\s+(?:studies|trials|articles|papers|publications)\b/i,
};

/**
 * Extract features from study text using keyword patterns
 */
export function extractFeatures(text: string): ExtractedFeatures {
  const normalizedText = text.toLowerCase();
  const matchedKeywords: string[] = [];

  // Helper to check pattern and track matches
  const checkPattern = (pattern: RegExp, keyword: string): boolean => {
    const match = pattern.test(text);
    if (match) {
      matchedKeywords.push(keyword);
    }
    return match;
  };

  // Extract sample size
  let sampleSizeText: string | null = null;
  let sampleSizeNumeric: number | null = null;
  const sampleMatch = text.match(PATTERNS.sampleSize);
  if (sampleMatch) {
    // Groups: 1=n_value, 2=n_multiplier, 3=sample_value, 4=sample_multiplier, 5=count_with_mult, 6=multiplier, 7=count_direct
    const numStr = sampleMatch[1] || sampleMatch[3] || sampleMatch[5] || sampleMatch[7];
    const multiplier = sampleMatch[2] || sampleMatch[4] || sampleMatch[6];
    if (numStr) {
      sampleSizeText = sampleMatch[0];
      let baseNum = parseFloat(numStr.replace(/,/g, ''));
      // Apply multiplier
      if (multiplier) {
        const mult = multiplier.toLowerCase();
        if (mult === 'million' || mult === 'm') {
          baseNum *= 1_000_000;
        } else if (mult === 'thousand' || mult === 'k') {
          baseNum *= 1_000;
        }
      }
      sampleSizeNumeric = Math.round(baseNum);
    }
  }

  // Extract study count for reviews
  let studyCountText: string | null = null;
  const studyCountMatch = text.match(PATTERNS.studyCount);
  if (studyCountMatch) {
    studyCountText = studyCountMatch[0];
  }

  return {
    // Study design indicators
    hasRandomization: checkPattern(PATTERNS.randomization, 'randomization'),
    hasPlacebo: checkPattern(PATTERNS.placebo, 'placebo'),
    hasControlGroup: checkPattern(PATTERNS.controlGroup, 'control_group'),
    hasBlinding: checkPattern(PATTERNS.blinding, 'blinding'),
    hasBaseline: checkPattern(PATTERNS.baseline, 'baseline'),
    hasClusterDesign: checkPattern(PATTERNS.clusterDesign, 'cluster_design'),

    // Quasi-experimental indicators
    hasDifferenceInDifferences: checkPattern(PATTERNS.differenceInDifferences, 'difference_in_differences'),
    hasParallelTrends: checkPattern(PATTERNS.parallelTrends, 'parallel_trends'),
    hasFixedEffects: checkPattern(PATTERNS.fixedEffects, 'fixed_effects'),
    hasInstrumentalVariable: checkPattern(PATTERNS.instrumentalVariable, 'instrumental_variable'),
    hasRegressionDiscontinuity: checkPattern(PATTERNS.regressionDiscontinuity, 'regression_discontinuity'),
    hasMatchingPSM: checkPattern(PATTERNS.matchingPSM, 'matching_psm'),
    hasSyntheticControl: checkPattern(PATTERNS.syntheticControl, 'synthetic_control'),
    hasEventStudy: checkPattern(PATTERNS.eventStudy, 'event_study'),

    // Quality indicators
    hasPowerCalculation: checkPattern(PATTERNS.powerCalculation, 'power_calculation'),
    hasPreRegistration: checkPattern(PATTERNS.preRegistration, 'pre_registration'),
    hasRobustnessChecks: checkPattern(PATTERNS.robustnessChecks, 'robustness_checks'),
    hasBalanceTests: checkPattern(PATTERNS.balanceTests, 'balance_tests'),
    hasSensitivityAnalysis: checkPattern(PATTERNS.sensitivityAnalysis, 'sensitivity_analysis'),
    hasCONSORT: checkPattern(PATTERNS.CONSORT, 'CONSORT'),
    hasPRISMA: checkPattern(PATTERNS.PRISMA, 'PRISMA'),
    hasDataAvailability: checkPattern(PATTERNS.dataAvailability, 'data_availability'),
    hasCodeAvailability: checkPattern(PATTERNS.codeAvailability, 'code_availability'),

    // Sample information
    sampleSizeText,
    sampleSizeNumeric,

    // Validity indicators
    hasAttritionDiscussion: checkPattern(PATTERNS.attrition, 'attrition'),
    hasSpilloverDiscussion: checkPattern(PATTERNS.spillover, 'spillover'),
    hasSelectionBiasDiscussion: checkPattern(PATTERNS.selectionBias, 'selection_bias'),
    hasExternalValidityDiscussion: checkPattern(PATTERNS.externalValidity, 'external_validity'),

    // Review/meta indicators
    isSystematicReview: checkPattern(PATTERNS.systematicReview, 'systematic_review'),
    isMetaAnalysis: checkPattern(PATTERNS.metaAnalysis, 'meta_analysis'),
    studyCountText,

    // Measurement indicators
    hasValidatedInstruments: checkPattern(PATTERNS.validatedInstruments, 'validated_instruments'),
    hasAdminData: checkPattern(PATTERNS.adminData, 'admin_data'),
    hasSelfReport: checkPattern(PATTERNS.selfReport, 'self_report'),
    hasObjectiveMeasures: checkPattern(PATTERNS.objectiveMeasures, 'objective_measures'),

    // Raw matches
    matchedKeywords,
  };
}
