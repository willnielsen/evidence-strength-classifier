import { StudyType, CausalMethod, ExtractedFeatures } from '../types.js';

/**
 * Method-specific assessment rubrics
 * Each method has a baseline strength and modifiers based on features
 */

interface MethodAssessment {
  baseStrength: number; // 0-5 baseline for the method
  strengthModifiers: Array<{
    feature: keyof ExtractedFeatures | ((f: ExtractedFeatures) => boolean);
    modifier: number;
    description: string;
  }>;
  requiredForStrong: string[];
  commonWeaknesses: string[];
}

const METHOD_RUBRICS: Record<CausalMethod, MethodAssessment> = {
  randomization: {
    baseStrength: 4.5,
    strengthModifiers: [
      { feature: 'hasBlinding', modifier: 0.3, description: 'Blinding present' },
      { feature: 'hasBalanceTests', modifier: 0.2, description: 'Balance tests reported' },
      { feature: 'hasPowerCalculation', modifier: 0.2, description: 'Power calculation' },
      { feature: 'hasAttritionDiscussion', modifier: 0.1, description: 'Attrition addressed' },
      { feature: 'hasPreRegistration', modifier: 0.2, description: 'Pre-registered' },
      {
        feature: (f) => f.sampleSizeNumeric !== null && f.sampleSizeNumeric < 100,
        modifier: -0.5,
        description: 'Small sample size (<100)',
      },
      {
        feature: (f) => f.sampleSizeNumeric !== null && f.sampleSizeNumeric < 30,
        modifier: -0.5,
        description: 'Very small sample size (<30)',
      },
    ],
    requiredForStrong: ['randomization', 'control group'],
    commonWeaknesses: ['attrition bias', 'non-compliance', 'spillovers', 'Hawthorne effect'],
  },

  difference_in_differences: {
    baseStrength: 3.5,
    strengthModifiers: [
      { feature: 'hasParallelTrends', modifier: 0.5, description: 'Parallel trends tested/discussed' },
      { feature: 'hasEventStudy', modifier: 0.3, description: 'Event study/dynamic effects shown' },
      { feature: 'hasFixedEffects', modifier: 0.2, description: 'Fixed effects used' },
      { feature: 'hasRobustnessChecks', modifier: 0.3, description: 'Robustness checks reported' },
      { feature: 'hasSensitivityAnalysis', modifier: 0.2, description: 'Sensitivity analysis' },
      {
        feature: (f) => !f.hasParallelTrends,
        modifier: -0.5,
        description: 'No parallel trends test',
      },
    ],
    requiredForStrong: ['difference-in-differences design', 'parallel trends plausibility'],
    commonWeaknesses: [
      'parallel trends violation',
      'anticipation effects',
      'composition changes',
      'treatment timing endogeneity',
    ],
  },

  regression_discontinuity: {
    baseStrength: 4.0,
    strengthModifiers: [
      { feature: 'hasRobustnessChecks', modifier: 0.4, description: 'Bandwidth sensitivity tested' },
      { feature: 'hasSensitivityAnalysis', modifier: 0.3, description: 'Manipulation tests' },
      { feature: 'hasBalanceTests', modifier: 0.2, description: 'Continuity of covariates' },
      {
        feature: (f) => f.sampleSizeNumeric !== null && f.sampleSizeNumeric > 1000,
        modifier: 0.2,
        description: 'Large sample near cutoff',
      },
    ],
    requiredForStrong: ['clear discontinuity', 'running variable', 'manipulation tests'],
    commonWeaknesses: [
      'manipulation of running variable',
      'bandwidth sensitivity',
      'local nature of estimate',
      'extrapolation concerns',
    ],
  },

  instrumental_variables: {
    baseStrength: 3.0,
    strengthModifiers: [
      { feature: 'hasRobustnessChecks', modifier: 0.4, description: 'Exclusion restriction discussed' },
      { feature: 'hasSensitivityAnalysis', modifier: 0.3, description: 'Weak instrument tests' },
      {
        feature: (f) => f.sampleSizeNumeric !== null && f.sampleSizeNumeric > 1000,
        modifier: 0.3,
        description: 'Large sample size',
      },
    ],
    requiredForStrong: ['instrument relevance', 'exclusion restriction argument', 'first-stage F-stat'],
    commonWeaknesses: [
      'weak instruments',
      'exclusion restriction violation',
      'monotonicity violation',
      'LATE interpretation',
    ],
  },

  propensity_score_matching: {
    baseStrength: 2.5,
    strengthModifiers: [
      { feature: 'hasBalanceTests', modifier: 0.4, description: 'Balance achieved post-matching' },
      { feature: 'hasSensitivityAnalysis', modifier: 0.4, description: 'Sensitivity to unobservables' },
      { feature: 'hasRobustnessChecks', modifier: 0.3, description: 'Multiple matching methods' },
    ],
    requiredForStrong: ['rich covariates', 'balance achieved', 'overlap/common support'],
    commonWeaknesses: [
      'unobserved confounding',
      'model dependence',
      'lack of overlap',
      'selection on unobservables',
    ],
  },

  synthetic_control: {
    baseStrength: 3.5,
    strengthModifiers: [
      { feature: 'hasRobustnessChecks', modifier: 0.4, description: 'Placebo tests in space' },
      { feature: 'hasSensitivityAnalysis', modifier: 0.3, description: 'Leave-one-out tests' },
      {
        feature: (f) => f.hasParallelTrends,
        modifier: 0.3,
        description: 'Good pre-treatment fit shown',
      },
    ],
    requiredForStrong: ['good pre-treatment fit', 'adequate donor pool', 'placebo tests'],
    commonWeaknesses: ['inadequate donor pool', 'poor pre-fit', 'treatment anticipation', 'interference'],
  },

  event_study: {
    baseStrength: 3.5,
    strengthModifiers: [
      { feature: 'hasParallelTrends', modifier: 0.4, description: 'Pre-trends shown flat' },
      { feature: 'hasRobustnessChecks', modifier: 0.3, description: 'Robustness to specification' },
      { feature: 'hasFixedEffects', modifier: 0.2, description: 'Unit and time fixed effects' },
    ],
    requiredForStrong: ['no pre-trends', 'clear treatment timing', 'appropriate controls'],
    commonWeaknesses: ['pre-trends', 'heterogeneous treatment timing', 'negative weights'],
  },

  fixed_effects: {
    baseStrength: 2.0,
    strengthModifiers: [
      { feature: 'hasRobustnessChecks', modifier: 0.3, description: 'Robustness checks' },
      {
        feature: (f) => f.sampleSizeNumeric !== null && f.sampleSizeNumeric > 500,
        modifier: 0.2,
        description: 'Reasonable sample',
      },
    ],
    requiredForStrong: ['within-variation argument', 'time-varying treatment'],
    commonWeaknesses: [
      'time-varying unobservables',
      'reverse causality',
      'limited within-variation',
      'strict exogeneity',
    ],
  },

  selection_on_observables: {
    baseStrength: 1.5,
    strengthModifiers: [
      { feature: 'hasBalanceTests', modifier: 0.2, description: 'Controls for observables' },
      { feature: 'hasRobustnessChecks', modifier: 0.2, description: 'Specification robustness' },
      { feature: 'hasSensitivityAnalysis', modifier: 0.3, description: 'Sensitivity analysis' },
    ],
    requiredForStrong: ['rich controls', 'theoretical justification for no unobserved confounding'],
    commonWeaknesses: [
      'omitted variable bias',
      'reverse causality',
      'selection bias',
      'confounding',
    ],
  },

  meta_analytic: {
    baseStrength: 3.5,
    strengthModifiers: [
      { feature: 'hasPRISMA', modifier: 0.3, description: 'PRISMA guidelines followed' },
      { feature: 'hasRobustnessChecks', modifier: 0.3, description: 'Heterogeneity analysis' },
      { feature: 'hasSensitivityAnalysis', modifier: 0.3, description: 'Publication bias tests' },
      { feature: 'hasPreRegistration', modifier: 0.2, description: 'Protocol registered' },
    ],
    requiredForStrong: ['systematic search', 'quality assessment', 'heterogeneity analysis'],
    commonWeaknesses: [
      'publication bias',
      'heterogeneity',
      'garbage in garbage out',
      'quality variation',
    ],
  },

  none: {
    baseStrength: 1.0,
    strengthModifiers: [],
    requiredForStrong: [],
    commonWeaknesses: ['no causal identification strategy'],
  },

  unknown: {
    baseStrength: 1.0,
    strengthModifiers: [],
    requiredForStrong: [],
    commonWeaknesses: ['unclear methodology'],
  },
};

/**
 * Assess causal strength for a given method and features
 */
export function assessCausalStrength(
  method: CausalMethod,
  features: ExtractedFeatures
): { score: number; justification: string } {
  const rubric = METHOD_RUBRICS[method];
  let score = rubric.baseStrength;
  const appliedModifiers: string[] = [];

  for (const mod of rubric.strengthModifiers) {
    let applies = false;
    if (typeof mod.feature === 'function') {
      applies = mod.feature(features);
    } else {
      applies = features[mod.feature] as boolean;
    }

    if (applies) {
      score += mod.modifier;
      appliedModifiers.push(`${mod.modifier > 0 ? '+' : ''}${mod.modifier}: ${mod.description}`);
    }
  }

  // Clamp score to 0-5
  score = Math.max(0, Math.min(5, score));
  score = Math.round(score * 10) / 10;

  // Build justification
  const methodLabel = method.replace(/_/g, ' ');
  let justification = `Base strength for ${methodLabel}: ${rubric.baseStrength}/5. `;

  if (appliedModifiers.length > 0) {
    justification += `Modifiers applied: ${appliedModifiers.join('; ')}. `;
  }

  if (rubric.requiredForStrong.length > 0) {
    justification += `Strong evidence requires: ${rubric.requiredForStrong.join(', ')}.`;
  }

  return { score, justification };
}

/**
 * Get common weaknesses for a method
 */
export function getMethodWeaknesses(method: CausalMethod): string[] {
  return METHOD_RUBRICS[method].commonWeaknesses;
}

/**
 * Get what's required for strong evidence for a method
 */
export function getRequiredForStrong(method: CausalMethod): string[] {
  return METHOD_RUBRICS[method].requiredForStrong;
}
