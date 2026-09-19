import { create } from 'zustand';
import { Database, LocalLoanRecord } from '../services/database';
import { calculateLoanFinancials, evaluateDebtSafety } from '../utils/emiCalculator';
import { NotificationService } from '../services/notifications';

export interface LoanSummary {
  totalBorrowed: number;
  totalPaid: number;
  totalDue: number;
  totalMonthlyEmi: number;
  activeCount: number;
  endedCount: number;
  allCount: number;
}

interface LoanState {
  loans: LocalLoanRecord[];
  activeFilter: 'active' | 'ended' | 'all';
  summary: LoanSummary;
  debtSafety: ReturnType<typeof evaluateDebtSafety>;
  isLoading: boolean;
  loadLoans: () => Promise<void>;
  addLoan: (loan: Omit<LocalLoanRecord, 'id' | 'createdAt'>) => Promise<void>;
  updateLoanPayment: (loanId: string, additionalPayment: number) => Promise<void>;
  deleteLoan: (loanId: string) => Promise<void>;
  setActiveFilter: (filter: 'active' | 'ended' | 'all') => void;
}

const SEED_LOANS: LocalLoanRecord[] = [
  {
    id: 'loan_kcc_01',
    schemeName: 'KCC - Crop Cultivation Credit',
    bankName: 'State Bank of India',
    principalAmount: 150000,
    interestRate: 4,
    tenureMonths: 36,
    paidAmount: 60000,
    nextEmiDate: '2026-10-15',
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'loan_tractor_02',
    schemeName: 'Agricultural Machinery Loan',
    bankName: 'Punjab National Bank',
    principalAmount: 300000,
    interestRate: 7.5,
    tenureMonths: 60,
    paidAmount: 120000,
    nextEmiDate: '2026-10-05',
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'loan_solar_03',
    schemeName: 'PM-KUSUM Solar Pump Loan',
    bankName: 'Bank of Baroda',
    principalAmount: 80000,
    interestRate: 5,
    tenureMonths: 24,
    paidAmount: 80000,
    status: 'ended',
    createdAt: new Date().toISOString(),
  },
];

export const useLoanStore = create<LoanState>((set, get) => ({
  loans: [],
  activeFilter: 'active',
  summary: {
    totalBorrowed: 0,
    totalPaid: 0,
    totalDue: 0,
    totalMonthlyEmi: 0,
    activeCount: 0,
    endedCount: 0,
    allCount: 0,
  },
  debtSafety: { status: 'safe', ratio: 0, label: 'Safe Debt Level', color: '#22c55e' },
  isLoading: false,

  async loadLoans() {
    set({ isLoading: true });
    await Database.init();
    let records = await Database.getAllLoans();

    // If no loans exist yet, seed initial demonstration loans
    if (records.length === 0) {
      for (const item of SEED_LOANS) {
        await Database.saveLoan(item);
      }
      records = SEED_LOANS;
    }

    // Recompute summary
    let totalBorrowed = 0;
    let totalPaid = 0;
    let totalDue = 0;
    let totalMonthlyEmi = 0;
    let activeCount = 0;
    let endedCount = 0;

    records.forEach((l) => {
      const calc = calculateLoanFinancials(l.principalAmount, l.interestRate, l.tenureMonths, l.paidAmount);
      totalBorrowed += calc.principal;
      totalPaid += l.paidAmount;
      if (l.status === 'active' && calc.dueAmount > 0) {
        totalDue += calc.dueAmount;
        totalMonthlyEmi += calc.monthlyEmi;
        activeCount++;
      } else {
        endedCount++;
      }
    });

    const summary: LoanSummary = {
      totalBorrowed,
      totalPaid,
      totalDue,
      totalMonthlyEmi,
      activeCount,
      endedCount,
      allCount: records.length,
    };

    // Calculate debt safety assuming 1,50,000 average annual income or profile value
    const annualEmi = totalMonthlyEmi * 12;
    const debtSafety = evaluateDebtSafety(150000, annualEmi);

    set({ loans: records, summary, debtSafety, isLoading: false });
  },

  async addLoan(loanData) {
    const newLoan: LocalLoanRecord = {
      ...loanData,
      id: 'loan_' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    await Database.saveLoan(newLoan);
    
    // Schedule reminder if EMI date provided
    if (newLoan.nextEmiDate) {
      const calc = calculateLoanFinancials(newLoan.principalAmount, newLoan.interestRate, newLoan.tenureMonths, newLoan.paidAmount);
      await NotificationService.scheduleEmiReminder(newLoan.schemeName, calc.monthlyEmi, newLoan.nextEmiDate);
    }

    await get().loadLoans();
  },

  async updateLoanPayment(loanId: string, additionalPayment: number) {
    const loan = get().loans.find((l) => l.id === loanId);
    if (!loan) return;

    const newPaid = loan.paidAmount + Math.max(0, additionalPayment);
    const calc = calculateLoanFinancials(loan.principalAmount, loan.interestRate, loan.tenureMonths, newPaid);
    const newStatus = calc.dueAmount <= 0 ? 'ended' : loan.status;

    const updated: LocalLoanRecord = {
      ...loan,
      paidAmount: newPaid,
      status: newStatus,
    };

    await Database.saveLoan(updated);
    await get().loadLoans();
  },

  async deleteLoan(loanId: string) {
    await Database.deleteLoan(loanId);
    await get().loadLoans();
  },

  setActiveFilter(filter) {
    set({ activeFilter: filter });
  },
}));
