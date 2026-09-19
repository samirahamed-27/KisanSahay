/**
 * Formats a number into Indian Rupee format: ₹1,50,000
 */
export function formatCurrency(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return '₹0';
  }
  const num = Math.round(Number(amount));
  return '₹' + num.toLocaleString('en-IN');
}

/**
 * Formats a percentage: 7% or 7.5%
 */
export function formatPercent(rate: number | string | undefined | null): string {
  if (rate === undefined || rate === null) return '0%';
  return `${Number(rate)}%`;
}
