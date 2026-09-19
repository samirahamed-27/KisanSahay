export interface LoanCalculation {
  principal: number;
  rate: number;
  tenureMonths: number;
  monthlyEmi: number;
  totalWithInterest: number;
  totalInterest: number;
  dueAmount: number;
  percentPaid: number;
  emisLeft: number;
}

export function calculateLoanFinancials(
  principalAmount: number,
  interestRate: number,
  tenureMonths: number,
  paidAmount: number = 0
): LoanCalculation {
  const principal = Math.max(0, Number(principalAmount) || 0);
  const rate = Math.max(0, Number(interestRate) || 0);
  const tenure = Math.max(1, Number(tenureMonths) || 12);
  const paid = Math.max(0, Number(paidAmount) || 0);

  let totalWithInterest = principal;
  let monthlyEmi = 0;

  if (rate === 0) {
    totalWithInterest = principal;
    monthlyEmi = Math.round(principal / tenure);
  } else {
    // Standard reducing balance EMI formula
    const monthlyRate = rate / 12 / 100;
    const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, tenure);
    const denominator = Math.pow(1 + monthlyRate, tenure) - 1;
    
    if (denominator > 0) {
      monthlyEmi = Math.round(numerator / denominator);
      totalWithInterest = monthlyEmi * tenure;
    } else {
      totalWithInterest = Math.round(principal * (1 + (rate * (tenure / 12)) / 100));
      monthlyEmi = Math.round(totalWithInterest / tenure);
    }
  }

  const totalInterest = Math.max(0, totalWithInterest - principal);
  const dueAmount = Math.max(0, totalWithInterest - paid);
  const percentPaid = totalWithInterest > 0 
    ? Math.min(100, Math.round((paid / totalWithInterest) * 100)) 
    : 100;
  const emisLeft = monthlyEmi > 0 ? Math.ceil(dueAmount / monthlyEmi) : 0;

  return {
    principal,
    rate,
    tenureMonths: tenure,
    monthlyEmi,
    totalWithInterest,
    totalInterest,
    dueAmount,
    percentPaid,
    emisLeft,
  };
}

export function evaluateDebtSafety(annualIncome: number, totalAnnualEmi: number): {
  status: 'safe' | 'moderate' | 'high_risk';
  ratio: number;
  label: string;
  color: string;
} {
  const income = Math.max(1, Number(annualIncome) || 1);
  const ratio = Math.round((totalAnnualEmi / income) * 100);

  if (ratio <= 35) {
    return {
      status: 'safe',
      ratio,
      label: 'Safe Debt Level',
      color: '#22c55e',
    };
  } else if (ratio <= 60) {
    return {
      status: 'moderate',
      ratio,
      label: 'Moderate Debt Load',
      color: '#f59e0b',
    };
  } else {
    return {
      status: 'high_risk',
      ratio,
      label: 'High Financial Strain',
      color: '#ef4444',
    };
  }
}
