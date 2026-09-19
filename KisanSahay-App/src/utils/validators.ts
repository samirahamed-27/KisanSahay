/**
 * Farmer Input Validators
 */

export function isValidIndianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 && /^[6-9]/.test(cleaned);
}

export function isValidAadhaar(aadhaar: string): boolean {
  const cleaned = aadhaar.replace(/\D/g, '');
  return cleaned.length === 12;
}

export function isValidPositiveNumber(val: any): boolean {
  const num = Number(val);
  return !isNaN(num) && num > 0;
}

export function sanitizeText(text: string): string {
  return (text || '').trim();
}
