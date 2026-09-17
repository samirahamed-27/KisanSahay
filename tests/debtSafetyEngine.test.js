const test = require('node:test');
const assert = require('node:assert/strict');
const { assessDebtSafety } = require('../src/services/debtSafetyEngine');

test('Debt Safety Engine - Safe DTI calculation', () => {
  const annualIncome = 300000; // Monthly income = 25,000
  const existingLoans = [
    { monthlyEmi: 4000, dueAmount: 50000 }
  ];

  const safety = assessDebtSafety(annualIncome, existingLoans);

  assert.strictEqual(safety.monthlyIncome, 25000);
  assert.strictEqual(safety.existingMonthlyDebtCommitment, 4000);
  assert.strictEqual(safety.debtToIncomeRatio, 16); // 4000/25000 = 16%
  assert.strictEqual(safety.riskLevel, 'Low Risk');
  assert.strictEqual(safety.isDebtTrapRisk, false);
  assert.ok(safety.maxSafeAdditionalEmi > 0);
});

test('Debt Safety Engine - Moderate DTI (30% - 50%)', () => {
  const annualIncome = 240000; // Monthly = 20,000
  const existingLoans = [
    { monthlyEmi: 7000, dueAmount: 100000 }
  ];

  const safety = assessDebtSafety(annualIncome, existingLoans);

  assert.strictEqual(safety.debtToIncomeRatio, 35); // 7000/20000 = 35%
  assert.strictEqual(safety.riskLevel, 'Moderate Risk');
  assert.strictEqual(safety.isDebtTrapRisk, false);
});

test('Debt Safety Engine - Debt Trap Warning when DTI > 50%', () => {
  const annualIncome = 240000; // Monthly = 20,000
  const existingLoans = [
    { monthlyEmi: 12000, dueAmount: 200000 }
  ];

  const safety = assessDebtSafety(annualIncome, existingLoans);

  assert.strictEqual(safety.debtToIncomeRatio, 60); // 12000/20000 = 60%
  assert.strictEqual(safety.riskLevel, 'High Risk');
  assert.strictEqual(safety.isDebtTrapRisk, true);
  assert.strictEqual(safety.maxSafeAdditionalEmi, 0);
  assert.ok(safety.debtTrapWarning.includes('CRITICAL'));
});

test('Debt Safety Engine - Zero income edge case', () => {
  const safety = assessDebtSafety(0, [{ monthlyEmi: 1000 }]);
  assert.strictEqual(safety.debtToIncomeRatio, 100);
  assert.strictEqual(safety.isDebtTrapRisk, true);
});
