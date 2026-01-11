import { classifyEvidence, getExtractedFeatures } from '../src/classifier.js';
import { ClassificationResult } from '../src/types.js';

// Sample abstracts for testing
const SAMPLE_ABSTRACTS = {
  rct: `
    Background: Micronutrient deficiencies remain prevalent in low-income settings. We conducted a randomized
    controlled trial to evaluate the impact of a fortified food supplement on child growth outcomes.

    Methods: We randomly assigned 1,200 children aged 6-24 months from 40 villages to receive either a
    fortified supplement (n=600) or placebo (n=600) for 12 months. Randomization was stratified by age and
    village. The primary outcome was height-for-age z-score (HAZ) at endline. Secondary outcomes included
    weight-for-age and hemoglobin levels. We conducted intention-to-treat analysis with pre-registered
    hypotheses. Balance tests confirmed successful randomization across 15 baseline characteristics.
    Attrition was 8% with no differential dropout between arms.

    Results: At 12 months, children in the treatment group showed significantly higher HAZ (+0.23 SD,
    95% CI: 0.11-0.35, p<0.001) compared to control. Robustness checks using alternative specifications
    and Lee bounds for attrition confirmed results.

    Conclusions: The fortified supplement significantly improved child growth with high internal validity.
    Trial registration: ISRCTN12345678.
  `,

  did: `
    This study evaluates the causal impact of a state-level minimum wage increase on employment using a
    difference-in-differences design. We exploit the staggered timing of minimum wage changes across
    U.S. states between 2010 and 2019.

    Our identification strategy relies on the parallel trends assumption, which we validate by showing
    flat pre-trends in an event study framework for 8 quarters before treatment. We use county-level
    administrative employment data from the Quarterly Census of Employment and Wages (N=850,000
    county-quarter observations) with county and quarter fixed effects.

    We find a small negative employment effect of -1.2% (SE=0.4%) in the restaurant sector, robust to
    alternative control groups, bandwidth choices, and the Callaway-Sant'Anna estimator for staggered
    DiD. Placebo tests using leads show no anticipation effects. Heterogeneity analysis reveals larger
    effects in counties with lower baseline wages.
  `,

  iv: `
    We estimate the returns to schooling using instrumental variables, exploiting exogenous variation from
    compulsory schooling law changes across European countries from 1960-1990. Our instrument is the
    mandated years of schooling, which varies by birth cohort and country.

    Using individual-level data from the European Social Survey (N=45,000), we estimate a two-stage least
    squares model. The first-stage F-statistic is 28.4, well above conventional thresholds for weak
    instruments. We argue the exclusion restriction is plausible because schooling laws affected education
    but not earnings directly, conditional on country and cohort fixed effects.

    Our IV estimate of returns to schooling is 9.2% per year (SE=2.1%), compared to 7.1% from OLS.
    Robustness checks include alternative instruments, sensitivity to exclusion restriction violations
    using Conley bounds, and subsample analysis.
  `,

  observational_cohort: `
    Objective: To examine the association between ultra-processed food consumption and cardiovascular
    disease risk in a prospective cohort study.

    Methods: We followed 52,000 adults from the UK Biobank for a median of 10 years. Diet was assessed
    using 24-hour dietary recalls at baseline. The primary outcome was incident cardiovascular disease
    identified through linked hospital records and death registries. We used Cox proportional hazards
    models adjusting for age, sex, BMI, smoking, physical activity, education, and total energy intake.

    Results: Participants in the highest quartile of ultra-processed food consumption had 18% higher
    CVD risk (HR=1.18, 95% CI: 1.09-1.28) compared to the lowest quartile. Results were robust to
    additional adjustment for dietary quality scores. Self-reported dietary data were validated against
    biomarkers in a subsample (r=0.65).

    Limitations: Observational design cannot establish causality. Residual confounding from unmeasured
    lifestyle factors remains possible despite extensive adjustment.
  `,

  systematic_review: `
    Background: Cash transfer programs are widely implemented to reduce poverty, but their effects on
    child education outcomes remain debated. We conducted a systematic review and meta-analysis of
    randomized and quasi-experimental evaluations.

    Methods: Following PRISMA guidelines, we searched 8 databases and grey literature through December 2023.
    Inclusion criteria: experimental or quasi-experimental studies, cash transfers to households,
    educational outcomes for children under 18. Two reviewers independently screened 2,450 titles and
    extracted data from 45 studies representing 28 programs across 15 countries. We assessed risk of bias
    using Cochrane RoB 2.0 for RCTs and ROBINS-I for quasi-experimental studies.

    Results: Meta-analysis of 32 RCTs found cash transfers increased school enrollment by 4.2 percentage
    points (95% CI: 2.8-5.6, I²=68%). Effects were larger for conditional transfers (+5.1pp) than
    unconditional (+2.8pp). Publication bias assessment using funnel plots and Egger's test (p=0.23)
    suggested low risk. Sensitivity analysis excluding high risk-of-bias studies yielded similar results.

    Protocol registration: PROSPERO CRD42023000001.
  `,

  rdd: `
    We estimate the effect of elite university attendance on earnings using a regression discontinuity
    design. Our running variable is the national college entrance exam score, with a sharp cutoff for
    admission to top-tier universities in China.

    Using administrative data from tax records linked to education records for 180,000 individuals within
    50 points of the cutoff, we implement local linear regression with triangular kernel weights.
    Manipulation tests (McCrary density test, p=0.34) confirm no sorting around the threshold. Continuity
    of predetermined covariates (parental income, gender, rural/urban) at the cutoff supports the validity
    of the design.

    We find elite university attendance increases earnings at age 30 by 15% (SE=4%). Results are robust
    to bandwidth selection (Calonico-Cattaneo-Titiunik optimal bandwidth, plus half and double) and
    polynomial order. The LATE interpretation applies to marginal admits near the cutoff.
  `,
};

describe('Evidence Strength Classifier', () => {
  describe('RCT Classification', () => {
    let result: ClassificationResult;

    beforeAll(() => {
      result = classifyEvidence(SAMPLE_ABSTRACTS.rct);
    });

    test('correctly identifies study type as RCT', () => {
      expect(result.study_type).toBe('rct');
    });

    test('identifies randomization as causal method', () => {
      expect(result.causal_method).toBe('randomization');
    });

    test('assigns high causal strength (>= 4)', () => {
      expect(result.causal_strength).toBeGreaterThanOrEqual(4);
    });

    test('overall grade is Strong or Very Strong', () => {
      expect(['Strong', 'Very Strong']).toContain(result.overall_evidence_grade);
    });

    test('detects key features', () => {
      const features = getExtractedFeatures(SAMPLE_ABSTRACTS.rct);
      expect(features.hasRandomization).toBe(true);
      expect(features.hasControlGroup).toBe(true);
      expect(features.hasPreRegistration).toBe(true);
      expect(features.hasBalanceTests).toBe(true);
    });

    test('extracts sample size', () => {
      expect(result.sample_size_info).toContain('1,200');
    });
  });

  describe('Difference-in-Differences Classification', () => {
    let result: ClassificationResult;

    beforeAll(() => {
      result = classifyEvidence(SAMPLE_ABSTRACTS.did);
    });

    test('correctly identifies study type as DiD', () => {
      expect(result.study_type).toBe('quasi_experimental_did');
    });

    test('identifies difference_in_differences as causal method', () => {
      expect(result.causal_method).toBe('difference_in_differences');
    });

    test('assigns moderate-high causal strength (>= 3)', () => {
      expect(result.causal_strength).toBeGreaterThanOrEqual(3);
    });

    test('overall grade is at least Moderate', () => {
      expect(['Moderate', 'Strong', 'Very Strong']).toContain(result.overall_evidence_grade);
    });

    test('detects parallel trends discussion', () => {
      const features = getExtractedFeatures(SAMPLE_ABSTRACTS.did);
      expect(features.hasParallelTrends).toBe(true);
      expect(features.hasEventStudy).toBe(true);
      expect(features.hasFixedEffects).toBe(true);
    });
  });

  describe('Instrumental Variables Classification', () => {
    let result: ClassificationResult;

    beforeAll(() => {
      result = classifyEvidence(SAMPLE_ABSTRACTS.iv);
    });

    test('correctly identifies study type as IV', () => {
      expect(result.study_type).toBe('quasi_experimental_iv');
    });

    test('identifies instrumental_variables as causal method', () => {
      expect(result.causal_method).toBe('instrumental_variables');
    });

    test('assigns moderate causal strength (>= 2.5)', () => {
      expect(result.causal_strength).toBeGreaterThanOrEqual(2.5);
    });

    test('identifies exclusion restriction as a risk or requirement', () => {
      const hasExclusionRisk = result.internal_validity_risks.some(
        (r) => r.risk.toLowerCase().includes('exclusion')
      );
      const justificationMentionsExclusion = result.causal_strength_justification
        .toLowerCase()
        .includes('exclusion');
      expect(hasExclusionRisk || justificationMentionsExclusion).toBe(true);
    });

    test('detects IV-specific features', () => {
      const features = getExtractedFeatures(SAMPLE_ABSTRACTS.iv);
      expect(features.hasInstrumentalVariable).toBe(true);
      expect(features.hasRobustnessChecks).toBe(true);
    });
  });

  describe('Observational Cohort Classification', () => {
    let result: ClassificationResult;

    beforeAll(() => {
      result = classifyEvidence(SAMPLE_ABSTRACTS.observational_cohort);
    });

    test('correctly identifies study type as observational cohort', () => {
      expect(result.study_type).toBe('observational_cohort');
    });

    test('assigns lower causal strength than RCT (< 3)', () => {
      expect(result.causal_strength).toBeLessThan(3);
    });

    test('overall grade is Moderate or lower', () => {
      expect(['Moderate', 'Weak', 'Very Weak']).toContain(result.overall_evidence_grade);
    });

    test('identifies unobserved confounding as high risk', () => {
      const confoundingRisk = result.internal_validity_risks.find(
        (r) => r.risk.toLowerCase().includes('confound')
      );
      expect(confoundingRisk).toBeDefined();
      expect(confoundingRisk?.severity).toBe('high');
    });

    test('detects admin data usage', () => {
      const features = getExtractedFeatures(SAMPLE_ABSTRACTS.observational_cohort);
      expect(features.hasAdminData).toBe(true);
      expect(features.hasBaseline).toBe(true);
    });
  });

  describe('Systematic Review / Meta-Analysis Classification', () => {
    let result: ClassificationResult;

    beforeAll(() => {
      result = classifyEvidence(SAMPLE_ABSTRACTS.systematic_review);
    });

    test('correctly identifies study type as meta-analysis', () => {
      expect(['systematic_review', 'meta_analysis']).toContain(result.study_type);
    });

    test('identifies meta_analytic as causal method', () => {
      expect(result.causal_method).toBe('meta_analytic');
    });

    test('detects PRISMA compliance', () => {
      const features = getExtractedFeatures(SAMPLE_ABSTRACTS.systematic_review);
      expect(features.hasPRISMA).toBe(true);
      expect(features.isMetaAnalysis).toBe(true);
    });

    test('overall grade is at least Moderate', () => {
      expect(['Moderate', 'Strong', 'Very Strong']).toContain(result.overall_evidence_grade);
    });

    test('identifies publication bias as a potential concern', () => {
      const pubBiasRisk = result.internal_validity_risks.find(
        (r) => r.risk.toLowerCase().includes('publication')
      );
      expect(pubBiasRisk).toBeDefined();
    });
  });

  describe('Regression Discontinuity Classification', () => {
    let result: ClassificationResult;

    beforeAll(() => {
      result = classifyEvidence(SAMPLE_ABSTRACTS.rdd);
    });

    test('correctly identifies study type as RDD', () => {
      expect(result.study_type).toBe('quasi_experimental_rdd');
    });

    test('identifies regression_discontinuity as causal method', () => {
      expect(result.causal_method).toBe('regression_discontinuity');
    });

    test('assigns high causal strength (>= 3.5)', () => {
      expect(result.causal_strength).toBeGreaterThanOrEqual(3.5);
    });

    test('detects manipulation tests', () => {
      const features = getExtractedFeatures(SAMPLE_ABSTRACTS.rdd);
      expect(features.hasRegressionDiscontinuity).toBe(true);
      expect(features.hasRobustnessChecks).toBe(true);
    });
  });

  describe('Output Structure Validation', () => {
    test('all required fields are present', () => {
      const result = classifyEvidence(SAMPLE_ABSTRACTS.rct);

      // Check all required fields exist
      expect(result).toHaveProperty('study_type');
      expect(result).toHaveProperty('causal_method');
      expect(result).toHaveProperty('causal_method_indicators');
      expect(result).toHaveProperty('causal_strength');
      expect(result).toHaveProperty('causal_strength_justification');
      expect(result).toHaveProperty('internal_validity_risks');
      expect(result).toHaveProperty('external_validity');
      expect(result).toHaveProperty('external_validity_notes');
      expect(result).toHaveProperty('measurement_quality');
      expect(result).toHaveProperty('measurement_quality_notes');
      expect(result).toHaveProperty('sample_size_info');
      expect(result).toHaveProperty('transparency_reproducibility');
      expect(result).toHaveProperty('transparency_signals');
      expect(result).toHaveProperty('overall_evidence_grade');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('recommended_use');
      expect(result).toHaveProperty('follow_up_questions');
      expect(result).toHaveProperty('disclaimer');
    });

    test('scores are within valid ranges', () => {
      const result = classifyEvidence(SAMPLE_ABSTRACTS.rct);

      expect(result.causal_strength).toBeGreaterThanOrEqual(0);
      expect(result.causal_strength).toBeLessThanOrEqual(5);
      expect(result.external_validity).toBeGreaterThanOrEqual(0);
      expect(result.external_validity).toBeLessThanOrEqual(5);
      expect(result.measurement_quality).toBeGreaterThanOrEqual(0);
      expect(result.measurement_quality).toBeLessThanOrEqual(5);
      expect(result.transparency_reproducibility).toBeGreaterThanOrEqual(0);
      expect(result.transparency_reproducibility).toBeLessThanOrEqual(5);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    test('evidence grade is valid enum value', () => {
      const result = classifyEvidence(SAMPLE_ABSTRACTS.rct);
      const validGrades = ['Very Strong', 'Strong', 'Moderate', 'Weak', 'Very Weak'];
      expect(validGrades).toContain(result.overall_evidence_grade);
    });

    test('JSON output is valid', () => {
      const result = classifyEvidence(SAMPLE_ABSTRACTS.rct);
      const jsonString = JSON.stringify(result);
      expect(() => JSON.parse(jsonString)).not.toThrow();
    });
  });

  describe('Determinism', () => {
    test('same input produces same output', () => {
      const result1 = classifyEvidence(SAMPLE_ABSTRACTS.rct);
      const result2 = classifyEvidence(SAMPLE_ABSTRACTS.rct);

      expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
    });
  });
});
