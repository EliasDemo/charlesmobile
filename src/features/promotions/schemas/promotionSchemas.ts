import { z } from 'zod';
import { dmyToIsoDate } from '@/shared/lib';

// Limits published in the contract (CreatePromotionDto, CreateCouponDto). Messages are
// `promotions` i18n keys.
const optionalDate = z
  .string()
  .refine((v) => v.trim() === '' || dmyToIsoDate(v) !== null, { error: 'form.dateInvalid' });
const optionalCount = z
  .string()
  .refine((v) => v.trim() === '' || (/^\d+$/.test(v.trim()) && Number(v) >= 1), {
    error: 'form.countInvalid',
  });
const name = z.string().trim().min(3, { error: 'form.nameLength' }).max(80, { error: 'form.nameLength' });

export const promotionSchema = z
  .object({
    name,
    type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
    value: z.string(),
    serviceId: z.string(),
    startsAt: optionalDate,
    endsAt: optionalDate,
    maxRedemptions: optionalCount,
    maxPerUser: optionalCount,
    daysOfWeek: z.array(z.number().int().min(0).max(6)),
    requiresCoupon: z.boolean(),
  })
  .superRefine((values, ctx) => {
    const raw = values.value.trim().replace(',', '.');
    const number = Number(raw);
    const ok =
      values.type === 'PERCENTAGE'
        ? /^\d+$/.test(raw) && number >= 1 && number <= 100
        : /^\d+(\.\d{1,2})?$/.test(raw) && number >= 1 && number <= 500;
    if (!ok) {
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: values.type === 'PERCENTAGE' ? 'form.percentRange' : 'form.amountRange',
      });
    }
  });
export type PromotionForm = z.infer<typeof promotionSchema>;

export const promotionEditSchema = z.object({
  name,
  endsAt: optionalDate,
  maxRedemptions: optionalCount,
  maxPerUser: optionalCount,
});
export type PromotionEditForm = z.infer<typeof promotionEditSchema>;

/** 4 to 20 letters or numbers; the backend stores it in capitals. */
export const couponCodeOk = (code: string) => /^[A-Za-z0-9]{4,20}$/.test(code.trim());

/** Soles as typed ("12.50") → céntimos for the API. A unit change, not a price rule. */
export const solesToCents = (value: string) => Math.round(Number(value.trim().replace(',', '.')) * 100);
