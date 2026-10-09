// Peruvian mobile numbers: the only phones the app accepts (register and profile).

const PERU_MOBILE = /^9\d{8}$/;

/**
 * Accepts "987654321", "987 654 321", "+51 987 654 321" or "51987654321" and returns the
 * national 9-digit number, or null when it is not a Peruvian mobile number.
 */
export function peruMobileDigits(input: string): string | null {
  let digits = input.replace(/[\s\-().]/g, '');
  if (digits.startsWith('+51')) digits = digits.slice(3);
  else if (digits.length === 11 && digits.startsWith('51')) digits = digits.slice(2);
  return PERU_MOBILE.test(digits) ? digits : null;
}

/** Format sent to the backend, as in its example: "+51 987 654 321". */
export function formatPeruMobile(digits: string): string {
  return `+51 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}
