import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { isApiError, isNetworkError, translateError, useSession } from '@/shared/api';
import { bookingKeys, createBooking, type CreatedBooking } from '../api/bookingApi';
import { useBookingDraft } from './bookingDraft';

export interface UseConfirmBookingOptions {
  onCreated: (bookingId: string) => void;
  /** No session: the route sends the user to login (or sign-up) and back here. */
  onRequireLogin: () => void;
  /** Email not verified: verify and come back here. */
  onRequireVerification: () => void;
  /** The slot was taken meanwhile: back to the slots, keeping the rest. */
  onSlotTaken: () => void;
}

interface CouponHandling {
  /** The coupon the last quote applied (sent with the booking). */
  couponCode?: string;
  /** 409 COUPON_NOT_VALID: the screen shows why, removes it and quotes again (no automatic retry). */
  onCouponRejected: (reason: string | null) => void;
}

/** Errors that leave the attempt open: retrying must reuse the same Idempotency-Key. */
function isRetryable(error: unknown): boolean {
  if (isNetworkError(error)) return true;
  return isApiError(error) && (error.status >= 500 || error.code === 'TOO_MANY_REQUESTS');
}

export function useConfirmBooking(options: UseConfirmBookingOptions & CouponHandling) {
  const queryClient = useQueryClient();
  const draft = useBookingDraft();
  const status = useSession((s) => s.status);
  const emailVerified = useSession((s) => s.user?.emailVerified === true);
  const [error, setError] = useState<string | null>(null);
  const [tooManyPending, setTooManyPending] = useState(false);

  const mutation = useMutation({
    mutationFn: (): Promise<CreatedBooking> => {
      const { barbershopId, serviceId, slot, barberId, keyForAttempt } = useBookingDraft.getState();
      return createBooking(
        {
          barbershopId: barbershopId!,
          serviceId: serviceId!,
          startAt: slot!.startAt,
          barberId,
          couponCode: options.couponCode,
        },
        keyForAttempt(),
      );
    },
    onSuccess: (booking) => {
      const { payment: _payment, ...detail } = booking;
      queryClient.setQueryData(bookingKeys.detail(booking.id), detail);
      void queryClient.invalidateQueries({ queryKey: bookingKeys.lists });
      void queryClient.invalidateQueries({ queryKey: ['availability'] });
      useBookingDraft.getState().reset();
      options.onCreated(booking.id);
    },
    onError: (err) => {
      if (isRetryable(err)) {
        // Same attempt: "Confirmar" again sends the same key and cannot create a second booking.
        setError(translateError(err).message);
        return;
      }
      useBookingDraft.getState().endAttempt();
      if (!isApiError(err)) return setError(translateError(err).message);
      switch (err.code) {
        case 'SLOT_NOT_AVAILABLE':
          useBookingDraft.getState().slotTaken();
          void queryClient.invalidateQueries({ queryKey: ['availability'] });
          options.onSlotTaken();
          return;
        case 'EMAIL_NOT_VERIFIED':
          options.onRequireVerification();
          return;
        case 'COUPON_NOT_VALID': {
          const reason = err.details[0]?.reason;
          options.onCouponRejected(typeof reason === 'string' ? reason : null);
          return;
        }
        case 'TOO_MANY_PENDING_BOOKINGS':
          setTooManyPending(true);
          return setError(translateError(err).message);
        default:
          return setError(translateError(err).message);
      }
    },
  });

  const complete = Boolean(draft.barbershopId && draft.serviceId && draft.slot);

  return {
    complete,
    submit: () => {
      if (!complete || mutation.isPending) return;
      setError(null);
      setTooManyPending(false);
      if (status !== 'authenticated') return options.onRequireLogin();
      if (!emailVerified) return options.onRequireVerification();
      mutation.mutate();
    },
    isSubmitting: mutation.isPending,
    error,
    tooManyPending,
  };
}
