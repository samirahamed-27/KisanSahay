import { useEffect } from 'react';
import { useLoanStore } from '../store/loanStore';

export function useLoans() {
  const {
    loans,
    activeFilter,
    summary,
    debtSafety,
    isLoading,
    loadLoans,
    addLoan,
    updateLoanPayment,
    deleteLoan,
    setActiveFilter,
  } = useLoanStore();

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  const displayedLoans = loans.filter((l) => {
    if (activeFilter === 'active') return l.status === 'active';
    if (activeFilter === 'ended') return l.status === 'ended';
    return true;
  });

  return {
    loans: displayedLoans,
    allLoans: loans,
    activeFilter,
    summary,
    debtSafety,
    isLoading,
    addLoan,
    updateLoanPayment,
    deleteLoan,
    setActiveFilter,
    refreshLoans: loadLoans,
  };
}
