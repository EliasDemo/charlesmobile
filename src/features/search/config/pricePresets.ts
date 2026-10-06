import type { Money } from '@/shared/lib';

/**
 * Price filter ranges, in céntimos as the API expects (`minPrice` / `maxPrice`). Change the ranges
 * here only: labels are built from these values. The backend matches barbershops with any service
 * in the range.
 */
export const PRICE_CURRENCY = 'PEN';

export const PRICE_PRESETS = [
  { id: 'upTo20', maxPrice: 2000 },
  { id: 'from20to40', minPrice: 2000, maxPrice: 4000 },
  // "Más de S/ 40": from one céntimo above the previous range.
  { id: 'over40', minPrice: 4001 },
] as const satisfies readonly { id: string; minPrice?: number; maxPrice?: number }[];

export type PricePresetId = (typeof PRICE_PRESETS)[number]['id'];

export const money = (amount: number): Money => ({ amount, currency: PRICE_CURRENCY });
