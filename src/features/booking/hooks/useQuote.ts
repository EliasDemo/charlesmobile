import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { i18n } from '@/shared/i18n';
import { fetchQuote, type BookingQuote, type CouponReason } from '../api/bookingApi';
import { useBookingDraft } from './bookingDraft';

/** Text for a coupon that was not applied (PROMOCIONES.md). */
export const couponReasonText = (reason: CouponReason | string): string =>
  i18n.t(`booking:coupon.reasons.${reason}` as 'booking:coupon.reasons.NOT_FOUND', {
    defaultValue: i18n.t('booking:coupon.reasons.NOT_APPLICABLE'),
  });

/**
 * The price before paying, as the backend computes it, and the coupon the person tries. The
 * coupon only travels to the booking when the last quote applied it.
 */
export function useQuote() {
  const { barbershopId, serviceId, slot } = useBookingDraft();
  const [couponInput, setCouponInput] = useState('');
  /** The code sent to the quote (what "Aplicar" confirmed). */
  const [couponCode, setCouponCode] = useState<string | null>(null);
  /** Shown under the field when the booking rejected the coupon (409 COUPON_NOT_VALID). */
  const [rejected, setRejected] = useState<string | null>(null);

  const complete = Boolean(barbershopId && serviceId && slot);
  const query = useQuery<BookingQuote>({
    queryKey: ['quote', barbershopId, serviceId, slot?.startAt, couponCode],
    queryFn: () =>
      fetchQuote({
        barbershopId: barbershopId!,
        serviceId: serviceId!,
        startAt: slot!.startAt,
        ...(couponCode ? { couponCode } : {}),
      }),
    enabled: complete,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });

  const coupon = query.data?.coupon ?? null;
  const applied = Boolean(couponCode && coupon?.applied);
  const message = rejected
    ? rejected
    : couponCode && coupon && !coupon.applied && coupon.reason
      ? couponReasonText(coupon.reason)
      : null;

  // A different body must not reuse the Idempotency-Key of an attempt.
  const newAttempt = () => useBookingDraft.getState().endAttempt();

  return {
    query,
    couponInput,
    setCouponInput: (value: string) => {
      setCouponInput(value);
      setRejected(null);
    },
    apply: () => {
      const code = couponInput.trim();
      if (!code) return;
      setRejected(null);
      newAttempt();
      setCouponCode(code);
    },
    remove: () => {
      setCouponCode(null);
      setCouponInput('');
      setRejected(null);
      newAttempt();
    },
    /** The code to send with the booking, or undefined. */
    bookingCoupon: applied ? (couponCode ?? undefined) : undefined,
    applied,
    /** A better automatic promotion won: not an error, the booking keeps the bigger discount. */
    betterPromotion: coupon?.reason === 'BETTER_PROMOTION',
    message,
    isChecking: query.isFetching && Boolean(couponCode),
    /** The booking said the coupon is not valid anymore: show why, drop it and quote again. */
    rejectCoupon: (reason: string | null) => {
      setRejected(couponReasonText(reason ?? 'NOT_APPLICABLE'));
      setCouponCode(null);
    },
  };
}
