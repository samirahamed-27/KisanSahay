/**
 * Responsible Lending & Debt Safety Engine
 * Protects farmers from predatory borrowing and debt traps through Debt-to-Income (DTI) analysis.
 */

const { calculateEMI, calculateTrueCostOfCredit, formatINR } = require('../utils/currency');

/**
 * Assess farmer's debt capacity and repayment safety
 * @param {Object} farmerProfile
 * @param {number} farmerProfile.annualIncome - Net annual farm earnings in INR
 * @param {number} farmerProfile.existingLoans - Current outstanding loans or monthly EMI commitments
 * @param {number} farmerProfile.landSizeAcres - Total cultivated land holding
 */
function assessDebtCapacity(farmerProfile) {
  const annualIncome = Math.max(30000, Number(farmerProfile.annualIncome) || 120000);
  const monthlyFarmIncome = Math.round(annualIncome / 12);
  
  // Existing EMI burden (if user provided existing loans amount vs monthly EMI)
  const existingDebtAmount = Number(farmerProfile.existingLoans) || 0;
  // Estimate monthly EMI of existing debts if not explicitly provided as monthly:
  // e.g. typical 3-year term loan @ 7%
  const existingMonthlyEmi = farmerProfile.existingMonthlyEmi !== undefined
    ? Number(farmerProfile.existingMonthlyEmi)
    : (existingDebtAmount > 0 ? calculateEMI(existingDebtAmount, 7.0, 36) : 0);

  // RBI / NABARD Responsible Lending Benchmarks for Agriculture:
  // Safe DTI threshold: <= 35% of monthly income
  // Warning DTI threshold: 35% - 50%
  // Debt Trap Risk threshold: > 50%
  const maxSafeMonthlyEmi = Math.round(monthlyFarmIncome * 0.40);
  const remainingSafeEmiCapacity = Math.max(0, maxSafeMonthlyEmi - existingMonthlyEmi);

  // Maximum safe borrowable principal for a 36-month loan @ 4% subsidized KCC rate
  const maxSafeSubsidizedLoan = Math.round((remainingSafeEmiCapacity * 36) / 1.06);

  const baselineDTI = monthlyFarmIncome > 0 ? Number(((existingMonthlyEmi / monthlyFarmIncome) * 100).toFixed(1)) : 0;

  return {
    annualIncome,
    monthlyFarmIncome,
    existingMonthlyEmi,
    maxSafeMonthlyEmi,
    remainingSafeEmiCapacity,
    maxSafeBorrowingLimit: Math.max(50000, maxSafeSubsidizedLoan),
    baselineDTI,
    baselineRiskStatus: baselineDTI > 40 ? 'HIGH_DEBT' : (baselineDTI > 25 ? 'MODERATE_DEBT' : 'SAFE')
  };
}

/**
 * Evaluates the safety of a specific scheme for this farmer
 * @param {Object} scheme - Scheme from database
 * @param {Object} farmerProfile - Farmer inputs
 * @param {Object} debtCapacity - Output of assessDebtCapacity
 */
function evaluateSchemeSafety(scheme, farmerProfile, debtCapacity) {
  // If scheme is a pure grant or non-repayable direct subsidy (e.g. PM-KISAN, PKVY, Rythu Bandhu)
  const isGrant = scheme.baseInterestRate === 0 && (scheme.subsidyPercentage === 100 || scheme.maxLoanAmount <= 25000);
  
  // Loan amount to evaluate: either farmer's requested amount or scheme standard recommended amount
  let testPrincipal = Number(farmerProfile.requestedLoanAmount) || 0;
  if (!testPrincipal || testPrincipal <= 0) {
    // Default to scheme limit or scaled by farmer's land holding
    const acres = Math.max(1, Number(farmerProfile.landSizeAcres) || 2);
    if (scheme.id === 'kcc' || scheme.id === 'miss') {
      testPrincipal = Math.min(scheme.maxLoanAmount, Math.max(50000, acres * 60000));
    } else {
      testPrincipal = Math.min(scheme.maxLoanAmount, 300000);
    }
  } else {
    testPrincipal = Math.min(testPrincipal, scheme.maxLoanAmount);
  }

  const effectiveRate = Number(scheme.subsidizedInterestRate || scheme.baseInterestRate || 7.0);
  const tenureMonths = scheme.defaultTenure || 36;

  // Calculate True Cost of Credit
  const creditDetails = calculateTrueCostOfCredit(testPrincipal, effectiveRate, tenureMonths, scheme.hiddenCharges);

  if (isGrant) {
    return {
      isSafe: true,
      riskLevel: 'ZERO_RISK_GRANT',
      dtiRatio: debtCapacity.baselineDTI,
      creditDetails: {
        ...creditDetails,
        monthlyEmi: 0,
        totalInterest: 0,
        totalRepaymentAmount: 0,
        totalCostOfCredit: 0
      },
      warningMessage: null,
      safetyBadge: '100% Grant / Zero Debt Risk',
      safetyScoreBonus: 15
    };
  }

  const totalMonthlyEmiAfterLoan = debtCapacity.existingMonthlyEmi + creditDetails.monthlyEmi;
  const projectedDti = debtCapacity.monthlyFarmIncome > 0
    ? Number(((totalMonthlyEmiAfterLoan / debtCapacity.monthlyFarmIncome) * 100).toFixed(1))
    : 100;

  let isSafe = true;
  let riskLevel = 'SAFE';
  let warningMessage = null;
  let safetyScoreBonus = 0;
  let safetyBadge = 'Safe Borrowing Level';

  if (projectedDti > 50) {
    isSafe = false;
    riskLevel = 'DEBT_TRAP_RISK';
    warningMessage = `Total monthly EMIs (${formatINR(totalMonthlyEmiAfterLoan)}) would exceed ${projectedDti}% of your estimated monthly income (${formatINR(debtCapacity.monthlyFarmIncome)}). High risk of debt distress.`;
    safetyBadge = 'Debt Trap Risk (High Burden)';
    safetyScoreBonus = -30; // Substantial penalty to prevent predatory prioritization
  } else if (projectedDti > 35) {
    riskLevel = 'MODERATE_BURDEN';
    warningMessage = `Total monthly EMIs will reach ${projectedDti}% of monthly income. Ensure buffer savings for seasonal price drops.`;
    safetyBadge = 'Manageable Burden with Care';
    safetyScoreBonus = -10;
  } else {
    riskLevel = 'SAFE';
    safetyBadge = 'Comfortably Within Safe Repayment Limits';
    safetyScoreBonus = 10;
  }

  return {
    isSafe,
    riskLevel,
    projectedDti,
    creditDetails,
    warningMessage,
    safetyBadge,
    safetyScoreBonus
  };
}

function assessDebtSafety(annualIncome, existingLoans = []) {
  const inc = Number(annualIncome) || 0;
  const monthlyIncome = inc > 0 ? Math.round(inc / 12) : 0;
  let totalMonthlyDebt = 0;
  let totalDue = 0;
  if (Array.isArray(existingLoans)) {
    existingLoans.forEach(loan => {
      totalMonthlyDebt += Number(loan.monthlyEmi || 0);
      totalDue += Number(loan.dueAmount || loan.principal || 0);
    });
  } else if (typeof existingLoans === 'number') {
    totalMonthlyDebt = existingLoans;
  }

  const dti = monthlyIncome > 0 ? Math.round((totalMonthlyDebt / monthlyIncome) * 100) : (totalMonthlyDebt > 0 ? 100 : 0);
  const isDebtTrapRisk = dti > 50;
  const riskLevel = dti <= 30 ? 'Low Risk' : (dti <= 50 ? 'Moderate Risk' : 'High Risk');
  const maxSafeMonthlyEmi = Math.round(monthlyIncome * 0.40);
  const maxSafeAdditionalEmi = isDebtTrapRisk ? 0 : Math.max(0, maxSafeMonthlyEmi - totalMonthlyDebt);

  return {
    annualIncome: inc,
    monthlyIncome,
    existingMonthlyDebtCommitment: totalMonthlyDebt,
    totalOutstandingDebt: totalDue,
    debtToIncomeRatio: dti,
    riskLevel,
    isDebtTrapRisk,
    maxSafeAdditionalEmi,
    debtTrapWarning: isDebtTrapRisk ? 'CRITICAL: Your current debt payments exceed 50% of your income. Borrowing more puts you at severe risk of a debt trap.' : null
  };
}

module.exports = {
  assessDebtCapacity,
  evaluateSchemeSafety,
  assessDebtSafety
};

