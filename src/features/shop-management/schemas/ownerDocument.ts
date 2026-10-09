export type OwnerDocumentType = 'RUC' | 'DNI';

export const DOCUMENT_LENGTH: Record<OwnerDocumentType, number> = { RUC: 11, DNI: 8 };

const RUC_PREFIXES = ['10', '15', '17', '20'];
const RUC_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

/** Digits only: the backend also accepts spaces, dots and dashes and strips them. */
export const documentDigits = (input: string) => input.replace(/[\s.-]/g, '');

/**
 * Local check of the owner's document, as the backend documents it (ALTA.md): DNI 8 digits; RUC
 * 11 digits, prefix 10/15/17/20 and SUNAT's modulo 11 check digit. The backend validates again.
 * Returns an i18n key of the `shop` namespace, or null when valid.
 */
export function ownerDocumentError(type: OwnerDocumentType, input: string): string | null {
  const digits = documentDigits(input);
  if (!/^\d+$/.test(digits) || digits.length !== DOCUMENT_LENGTH[type]) return `document.length${type}`;
  if (type === 'DNI') return null;
  if (!RUC_PREFIXES.includes(digits.slice(0, 2))) return 'document.rucInvalid';
  const sum = RUC_WEIGHTS.reduce((acc, weight, i) => acc + weight * Number(digits[i]), 0);
  const check = (11 - (sum % 11)) % 10;
  return check === Number(digits[10]) ? null : 'document.rucInvalid';
}
