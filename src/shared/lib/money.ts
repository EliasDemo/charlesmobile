import type { components } from '@/shared/api/generated/schema';
import { displayLocale } from './locale';

export type Money = components['schemas']['MoneyDto'];

const formatters = new Map<string, Intl.NumberFormat>();

interface MoneyFormatOptions {
  /** Drop ",00" from whole amounts ("S/ 20" in filter labels). */
  compact?: boolean;
  /** Without the currency symbol, for the second end of a range ("S/ 20–40"). */
  symbol?: boolean;
}

function formatterFor(
  currency: string,
  { compact = false, symbol = true }: MoneyFormatOptions,
): Intl.NumberFormat {
  const locale = displayLocale();
  const key = `${locale}:${currency}:${compact}:${symbol}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    const digits = new Intl.NumberFormat(locale, { style: 'currency', currency }).resolvedOptions()
      .maximumFractionDigits;
    formatter = new Intl.NumberFormat(locale, {
      ...(symbol ? { style: 'currency', currency } : { style: 'decimal', maximumFractionDigits: digits }),
      minimumFractionDigits: compact ? 0 : digits,
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

/**
 * The only money formatter. `amount` arrives in minor units (céntimos); the app only displays it
 * and never adds, subtracts or applies percentages.
 */
export function formatMoney({ amount, currency }: Money, options: MoneyFormatOptions = {}): string {
  const digits = formatterFor(currency, {}).resolvedOptions().maximumFractionDigits ?? 2;
  return formatterFor(currency, options).format(amount / 10 ** digits);
}
