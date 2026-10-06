import type { components } from '@/shared/api/generated/schema';

export type Money = components['schemas']['MoneyDto'];

const LOCALE = 'es-PE';
const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(currency: string): Intl.NumberFormat {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency });
    formatters.set(currency, formatter);
  }
  return formatter;
}

/**
 * The only money formatter. `amount` arrives in minor units (céntimos); the app only displays it
 * and never adds, subtracts or applies percentages.
 */
export function formatMoney({ amount, currency }: Money): string {
  const formatter = formatterFor(currency);
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(amount / 10 ** digits);
}
