/**
 * Currency & Financial Mathematics Utilities for Indian Agricultural Finance
 */

function formatINR(amount) {
  const num = Number(amount) || 0;
  return '₹' + num.toLocaleString('en-IN');
}

/**
 * Standard reducing-balance EMI calculation
 * @param {number} principal - Loan amount in INR
 * @param {number} annualRate - Annual interest rate percentage (e.g. 4.0 for 4%)
 * @param {number} tenureMonths - Loan tenure in months
 * @returns {number} Monthly EMI in INR rounded to nearest rupee
 */
function calculateEMI(principal, annualRate, tenureMonths) {
  const P = Number(principal) || 0;
  const rate = Number(annualRate) || 0;
  const N = Math.max(1, Number(tenureMonths) || 12);

  if (P <= 0) return 0;
  if (rate <= 0) return Math.round(P / N);

  const r = rate / 12 / 100;
  const emi = (P * r * Math.pow(1 + r, N)) / (Math.pow(1 + r, N) - 1);
  return Math.round(emi);
}

/**
 * Total interest payable over the tenure
 */
function calculateTotalInterest(principal, emi, tenureMonths) {
  const P = Number(principal) || 0;
  const E = Number(emi) || 0;
  const N = Math.max(1, Number(tenureMonths) || 12);
  const totalPaid = E * N;
  return Math.max(0, totalPaid - P);
}

/**
 * Calculate realistic True Cost of Credit including upfront charges
 */
function calculateTrueCostOfCredit(principal, annualRate, tenureMonths, hiddenCharges = {}) {
  const P = Number(principal) || 0;
  const rate = Number(annualRate) || 0;
  const tenure = Math.max(1, Number(tenureMonths) || 12);

  const emi = calculateEMI(P, rate, tenure);
  const totalInterest = calculateTotalInterest(P, emi, tenure);

  const processingFeeRate = Number(hiddenCharges.processingFeePercentage || 0);
  const processingFee = Math.round((P * processingFeeRate) / 100);
  const gstOnProcessing = Math.round(processingFee * 0.18); // 18% GST on bank fees
  const docCharges = Number(hiddenCharges.documentationCharges || 0);
  const stampDuty = Math.round((P * Number(hiddenCharges.stampDutyPercentage || 0.1)) / 100);
  const insurance = Math.round((P * Number(hiddenCharges.insuranceRatePercentage || 0)) / 100);

  const upfrontCharges = processingFee + gstOnProcessing + docCharges + stampDuty + insurance;
  const totalCost = totalInterest + upfrontCharges;
  const netAmountDisbursed = Math.max(0, P - upfrontCharges);

  return {
    principal: P,
    statedInterestRate: rate,
    tenureMonths: tenure,
    monthlyEmi: emi,
    totalInterest,
    upfrontCharges: {
      processingFee,
      gstOnProcessing,
      documentationCharges: docCharges,
      stampDuty,
      mandatoryInsurance: insurance,
      totalUpfrontDeductions: upfrontCharges
    },
    netAmountDisbursed,
    totalRepaymentAmount: P + totalInterest,
    totalCostOfCredit: totalCost,
    effectiveAnnualRate: (P > 0 && tenure > 0) ? Number(((totalCost / P) / (tenure / 12) * 100).toFixed(2)) : rate
  };
}

module.exports = {
  formatINR,
  calculateEMI,
  calculateTotalInterest,
  calculateTrueCostOfCredit
};
