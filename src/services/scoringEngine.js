/**
 * Multi-Factor Agricultural Loan & Scheme Scoring Engine
 * Evaluates, scores (0-100), and ranks schemes into the exact sequence:
 * 1 Best Match -> 10-11 Good Alternatives -> Moderate Fits -> Ineligible (listed last).
 */

const { assessDebtCapacity, evaluateSchemeSafety } = require('./debtSafetyEngine');
const { calculateCropSoilSuitability } = require('./locationContext');
const { formatINR } = require('../utils/currency');

/**
 * Evaluates and scores an individual scheme for a farmer
 */
function scoreScheme(scheme, farmerProfile, locationContext, debtCapacity) {
  const farmerOwnership = (farmerProfile.landOwnership || 'owner').toLowerCase().trim();
  const farmerLandAcres = Number(farmerProfile.landSizeAcres) || 2.0;
  const farmerCategory = (farmerProfile.category || 'general').toLowerCase().trim(); // general, sc, st, obc, women
  const farmerCrops = (farmerProfile.cropType || 'mixed').toLowerCase();
  const farmerIncome = Number(farmerProfile.annualIncome) || 120000;
  const farmerState = (farmerProfile.state || locationContext.resolvedLocation.state || '').toLowerCase();
  const hasAadhaar = farmerProfile.hasAadhaar !== false && String(farmerProfile.hasAadhaar).toLowerCase() !== 'no';
  const hasKcc = farmerProfile.hasKcc === true || String(farmerProfile.hasKcc).toLowerCase() === 'yes';

  let eligible = true;
  const matchReasons = [];
  const unmetCriteria = [];
  const warnings = [];

  // =========================================================================
  // FACTOR 1: Eligibility Match (Weight: 35%)
  // =========================================================================
  let eligibilityPoints = 100;
  const crit = scheme.eligibilityCriteria || {};

  // 1a. Land Ownership check
  const allowedOwnerships = (crit.farmerTypes || ['owner', 'tenant', 'sharecropper', 'leaseholder']).map(o => o.toLowerCase());
  if (!allowedOwnerships.includes(farmerOwnership) && !allowedOwnerships.includes('all')) {
    if (scheme.id === 'pm-kisan') {
      eligible = false;
      eligibilityPoints -= 60;
      unmetCriteria.push('PM-KISAN requires own cultivable land in applicant’s name; tenant or leased land is excluded by guidelines.');
    } else if (farmerOwnership === 'tenant' || farmerOwnership === 'sharecropper') {
      eligibilityPoints -= 20;
      warnings.push('Tenant / sharecropper status requires local tenancy verification certificate or JLG grouping.');
    } else {
      eligibilityPoints -= 40;
      unmetCriteria.push(`Requires farmer ownership type: ${allowedOwnerships.join(', ')}`);
    }
  } else {
    matchReasons.push(`Eligible for your ${farmerOwnership.toUpperCase()} landholding status.`);
  }

  // 1b. Land Size check
  if (crit.minLandAcres && farmerLandAcres < crit.minLandAcres) {
    eligible = false;
    eligibilityPoints -= 45;
    unmetCriteria.push(`Requires minimum landholding of ${crit.minLandAcres} acres (you have ${farmerLandAcres} acres).`);
  } else if (crit.maxLandAcres && farmerLandAcres > crit.maxLandAcres) {
    eligible = false;
    eligibilityPoints -= 45;
    unmetCriteria.push(`Targeted exclusively for small/marginal farmers up to ${crit.maxLandAcres} acres (you hold ${farmerLandAcres} acres).`);
  } else {
    matchReasons.push(`Land size of ${farmerLandAcres} acres fits eligibility brackets.`);
  }

  // 1c. Social Category & Special Affirmative Action (SC / ST / Women)
  const allowedCategories = (crit.allowedCategories || ['general', 'sc', 'st', 'obc', 'women']).map(c => c.toLowerCase());
  const isDedicatedCategoryScheme = scheme.id === 'standup-india-agri';
  
  if (isDedicatedCategoryScheme) {
    if (farmerCategory !== 'sc' && farmerCategory !== 'st' && farmerCategory !== 'women') {
      eligible = false;
      eligibilityPoints -= 60;
      unmetCriteria.push('Exclusively reserved for SC, ST, or Women entrepreneurs.');
    } else {
      eligibilityPoints += 10;
      matchReasons.push(`Priority reservation for ${farmerCategory.toUpperCase()} agri-entrepreneur.`);
    }
  } else if (farmerCategory === 'women' || farmerCategory === 'sc' || farmerCategory === 'st') {
    // Priority bonus for higher subsidy under SMAM, PM-KUSUM, PMMSY, MIDH
    if (scheme.subsidyPercentage > 0) {
      matchReasons.push(`Eligible for elevated ${farmerCategory.toUpperCase()} subsidy tier (up to +15% extra assistance).`);
      eligibilityPoints += 5;
    }
  }

  // 1d. Income Cap check
  if (crit.maxAnnualIncome && farmerIncome > crit.maxAnnualIncome) {
    eligible = false;
    eligibilityPoints -= 50;
    unmetCriteria.push(`Statutory income ceiling of ${formatINR(crit.maxAnnualIncome)} exceeded by your annual earnings.`);
  }

  // 1e. Aadhaar & KCC Requirements
  if (crit.requiresAadhaar && !hasAadhaar) {
    eligible = false;
    eligibilityPoints -= 35;
    unmetCriteria.push('Aadhaar bank account linking is mandatory for DBT subsidy disbursement.');
  } else {
    matchReasons.push('Aadhaar linked for automated DBT benefit transfer.');
  }

  if (crit.requiresKcc) {
    if (hasKcc) {
      matchReasons.push('Active KCC holder qualifies immediately for 3% prompt repayment subvention (4% net rate).');
      eligibilityPoints += 5;
    } else {
      warnings.push('Requires opening or linking an active Kisan Credit Card account.');
      eligibilityPoints -= 15;
    }
  }

  // =========================================================================
  // FACTOR 2: Financial Attractiveness & Subvention (Weight: 25%)
  // =========================================================================
  let financialPoints = 50;
  const netRate = scheme.subsidizedInterestRate || scheme.baseInterestRate || 7.0;
  
  if (netRate <= 0.0) {
    financialPoints = 100; // 0% interest / pure grant
    matchReasons.push('0% interest / 100% government assistance.');
  } else if (netRate <= 4.0) {
    financialPoints = 95; // Ultra low 4% subsidized KCC rate
    matchReasons.push(`Highly attractive ${netRate}% effective annual interest.`);
  } else if (netRate <= 6.0) {
    financialPoints = 80;
  } else if (netRate <= 8.5) {
    financialPoints = 65;
  } else {
    financialPoints = 45;
  }

  if (scheme.subsidyPercentage >= 50) {
    financialPoints += 15;
    matchReasons.push(`High capital subsidy of ${scheme.subsidyPercentage}% on project cost.`);
  } else if (scheme.subsidyPercentage >= 30) {
    financialPoints += 10;
  }

  // =========================================================================
  // FACTOR 3: Regional & State Relevance (Weight: 15%)
  // =========================================================================
  let regionalPoints = 85;
  const applicableStates = (crit.statesApplicable || ['all']).map(s => s.toLowerCase());

  if (!applicableStates.includes('all') && !applicableStates.some(s => farmerState.includes(s))) {
    eligible = false;
    regionalPoints = 20;
    unmetCriteria.push(`Scheme is geographically restricted to: ${crit.statesApplicable.join(', ')}.`);
  } else if (applicableStates.some(s => farmerState.includes(s)) && !applicableStates.includes('all')) {
    regionalPoints = 100; // State-specific bonus
    matchReasons.push(`State-specific scheme actively active in ${locationContext.resolvedLocation.state}.`);
  } else {
    regionalPoints = 90; // Pan-India
    matchReasons.push('Applicable across all agricultural districts pan-India.');
  }

  // =========================================================================
  // FACTOR 4: Crop & Soil Suitability (Weight: 15%)
  // =========================================================================
  let cropSoilPoints = 75;
  const supportedCrops = (crit.cropsSupported || ['all']).map(c => c.toLowerCase());
  
  if (supportedCrops.includes('all')) {
    cropSoilPoints = 85;
  } else {
    const isCropSupported = supportedCrops.some(sc => farmerCrops.includes(sc) || sc.includes(farmerCrops));
    if (isCropSupported) {
      cropSoilPoints = 100;
      matchReasons.push(`Specifically designed for your crop / activity: ${farmerCrops}.`);
    } else {
      cropSoilPoints = 40;
      warnings.push(`Primary focus is for ${supportedCrops.slice(0, 4).join(', ')} rather than ${farmerCrops}.`);
    }
  }

  const soilScore = calculateCropSoilSuitability(farmerCrops, locationContext);
  cropSoilPoints = Math.round((cropSoilPoints * 0.6) + (soilScore * 0.4));

  // =========================================================================
  // FACTOR 5: Application Ease & Documentation Burden (Weight: 10%)
  // =========================================================================
  let applicationPoints = 80;
  const docCount = (scheme.documents || []).length;
  if (docCount <= 3) {
    applicationPoints = 95;
    matchReasons.push('Minimal documentation requirement (quick branch turnaround).');
  } else if (docCount <= 5) {
    applicationPoints = 80;
  } else {
    applicationPoints = 60;
    warnings.push('Requires comprehensive DPR or multiple statutory departmental clearances.');
  }

  // =========================================================================
  // RESPONSIBLE LENDING / DEBT SAFETY EVALUATION
  // =========================================================================
  const safetyAssessment = evaluateSchemeSafety(scheme, farmerProfile, debtCapacity);
  let totalScore = Math.round(
    (Math.max(0, eligibilityPoints) * 0.35) +
    (Math.min(100, financialPoints) * 0.25) +
    (regionalPoints * 0.15) +
    (cropSoilPoints * 0.15) +
    (applicationPoints * 0.10) +
    (safetyAssessment.safetyScoreBonus || 0)
  );

  // If debt trap risk is detected, clamp maximum score and flag strongly
  if (!safetyAssessment.isSafe) {
    totalScore = Math.min(totalScore, 68);
    warnings.push(safetyAssessment.warningMessage);
  }

  // Clamp score bounds
  totalScore = Math.max(10, Math.min(99, totalScore));

  // Hard clamp if completely ineligible
  if (!eligible) {
    totalScore = Math.min(totalScore, 48);
  }

  // Generate clear plain-language summary reason
  let primaryReason = '';
  if (!eligible) {
    primaryReason = unmetCriteria[0] || 'Did not meet statutory scheme criteria.';
  } else if (totalScore >= 90) {
    primaryReason = `Outstanding match for your ${farmerOwnership} farm profile (${farmerLandAcres} acres) with subsidized ${netRate}% rate and direct subvention.`;
  } else if (totalScore >= 75) {
    primaryReason = `Strong financial alternative with ${scheme.subCategory} support and low borrowing cost.`;
  } else {
    primaryReason = warnings[0] || 'Moderate fit requiring additional documentation or partner bank approval.';
  }

  return {
    scheme_id: scheme.id,
    scheme_name: scheme.name,
    short_name: scheme.shortName,
    category: scheme.category,
    sub_category: scheme.subCategory,
    provider: scheme.provider,
    score: totalScore,
    eligible,
    interest_rate: netRate <= 0 ? '0% (Non-Repayable Grant)' : `${netRate}% p.a.`,
    stated_base_rate: `${scheme.baseInterestRate}% p.a.`,
    subsidy_percentage: scheme.subsidyPercentage ? `${scheme.subsidyPercentage}%` : '0%',
    max_loan_amount: formatINR(scheme.maxLoanAmount),
    max_loan_amount_num: scheme.maxLoanAmount,
    collateral_free_limit: formatINR(scheme.collateralFreeLimit),
    default_tenure_months: scheme.defaultTenure,
    eligibility_reason: primaryReason,
    match_reasons: matchReasons,
    unmet_criteria: unmetCriteria,
    warnings: warnings,
    debt_safety: {
      is_safe: safetyAssessment.isSafe,
      risk_level: safetyAssessment.riskLevel,
      projected_dti: `${safetyAssessment.projectedDti}%`,
      safety_badge: safetyAssessment.safetyBadge,
      credit_details: safetyAssessment.creditDetails
    },
    score_breakdown: {
      eligibility: Math.round(Math.max(0, eligibilityPoints)),
      financial: Math.round(Math.min(100, financialPoints)),
      regional: Math.round(regionalPoints),
      crop_soil: Math.round(cropSoilPoints),
      application: Math.round(applicationPoints)
    },
    scoreBreakdown: {
      eligibility: Math.round(Math.max(0, eligibilityPoints)),
      financial: Math.round(Math.min(100, financialPoints)),
      regional: Math.round(regionalPoints),
      crop_soil: Math.round(cropSoilPoints),
      application: Math.round(applicationPoints)
    },
    financial_summary: safetyAssessment.creditDetails || {},
    financialSummary: safetyAssessment.creditDetails || {},
    documents_required: (scheme.documents || []).map(d => ({ name: d.name, required: d.required, description: d.desc })),
    apply_link: scheme.application ? scheme.application.applyUrl : 'https://www.myscheme.gov.in',
    offline_application_center: scheme.application ? scheme.application.offlineCenter : 'Nearest Bank Branch',
    application_deadline: scheme.application ? scheme.application.deadline : 'Ongoing',
    highlights: scheme.highlights || [],
    tagline: scheme.tagline
  };
}

/**
 * Score all schemes and sort into the exact specified sequence:
 * 1 Best Match -> 10-11 Good Alternatives -> Moderate Fits -> Ineligible (shown last)
 */
function rankSchemes(schemesDatabase, farmerProfile, locationContext) {
  const debtCapacity = assessDebtCapacity(farmerProfile);

  // Score all schemes
  const scored = schemesDatabase.map(s => scoreScheme(s, farmerProfile, locationContext, debtCapacity));

  // Separate into eligible (score >= 50) and ineligible (score < 50)
  const eligibleSchemes = scored.filter(s => s.eligible && s.score >= 50);
  const ineligibleSchemes = scored.filter(s => !s.eligible || s.score < 50);

  // Sort eligible descending by score
  eligibleSchemes.sort((a, b) => b.score - a.score);
  // Sort ineligible descending by score as well
  ineligibleSchemes.sort((a, b) => b.score - a.score);

  const recommendations = [];

  // 1. BEST MATCH (Highest score)
  if (eligibleSchemes.length > 0) {
    const best = eligibleSchemes[0];
    best.status = 'best'; // Green
    best.recommendationStatus = 'best';
    best.status_label = 'Best Match (Top Recommendation)';
    best.colorCode = '#15803d';
    recommendations.push(best);
  }

  // 2. GOOD ALTERNATIVES (Next 10-11 schemes)
  const goodPool = eligibleSchemes.slice(1, 12);
  goodPool.forEach(item => {
    item.status = 'good'; // Light Green
    item.recommendationStatus = 'good';
    item.status_label = 'Good Alternative';
    item.colorCode = '#16a34a';
    recommendations.push(item);
  });

  // 3. MODERATE FIT SCHEMES (Remaining eligible schemes)
  const moderatePool = eligibleSchemes.slice(12);
  moderatePool.forEach(item => {
    item.status = 'moderate'; // Orange
    item.recommendationStatus = 'moderate';
    item.status_label = 'Moderate Fit (Review Needed)';
    item.colorCode = '#d97706';
    recommendations.push(item);
  });

  // 4. INELIGIBLE SCHEMES (Listed LAST for transparency)
  ineligibleSchemes.forEach(item => {
    item.status = 'ineligible'; // Red
    item.recommendationStatus = 'ineligible';
    item.status_label = 'Not Eligible (See Unmet Criteria)';
    item.colorCode = '#dc2626';
    recommendations.push(item);
  });

  return {
    debt_capacity: debtCapacity,
    recommendations,
    meta: {
      total_schemes_evaluated: scored.length,
      best_count: eligibleSchemes.length > 0 ? 1 : 0,
      good_count: goodPool.length,
      moderate_count: moderatePool.length,
      ineligible_count: ineligibleSchemes.length
    }
  };
}

module.exports = {
  scoreScheme,
  rankSchemes,
  calculateSchemeScore: (scheme, farmerProfile, locationContext = {}, debtCapacity = {}) => {
    const loc = locationContext.resolvedLocation ? locationContext : { resolvedLocation: { state: farmerProfile.state || '' } };
    const debt = debtCapacity.monthlyFarmIncome ? debtCapacity : assessDebtCapacity(farmerProfile);
    const res = scoreScheme(scheme, farmerProfile, loc, debt);
    return { totalScore: res.score, ...res };
  },
  rankAndSequenceSchemes: (farmerProfile, schemesDatabase) => {
    const { getLocationContext } = require('./locationContext');
    const loc = getLocationContext(farmerProfile);
    const result = rankSchemes(schemesDatabase, farmerProfile, loc);
    return result.recommendations.map(r => ({
      ...r,
      matchScore: r.score,
      scoreBreakdown: r.score_breakdown || r.scoreBreakdown || {},
      financialSummary: r.financial_summary || r.financialSummary || {}
    }));
  }
};

