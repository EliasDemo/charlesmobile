import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { nextPageParam, translateError } from '@/shared/api';
import { i18n } from '@/shared/i18n';
import { addToCalendar, useCountdown } from '@/shared/lib';
import { showToast } from '@/shared/ui';
import { checkoutFor, type Checkout, type CheckoutOutcome } from '@/shared/payments';
import {
  bookingKeys,
  cancelBooking,
  fetchBooking,
  fetchCancellationPreview,
  fetchMyBookings,
  fetchPayment,
  startPayment,
  type Booking,
  type BookingPage,
  type BookingScope,
  type CancelledBooking,
} from '../api/bookingApi';

/** While a booking waits for payment, its real state is read this often (only on screen). */
export const PENDING_POLL_MS = 10_000;
/** Right after a checkout finished, the confirmation is read more often. */
export const CONFIRMING_POLL_MS = 3_000;

/** Poll only a pending booking, only while its screen is visible; final states stop it. */
export function pollInterval(
  status: Booking['status'] | undefined,
  screenVisible: boolean,
  confirming = false,
): number | false {
  if (status !== 'PENDING_PAYMENT' || !screenVisible) return false;
  return confirming ? CONFIRMING_POLL_MS : PENDING_POLL_MS;
}

/**
 * One booking, always as the backend says. A pending one is read again every 10 s while the
 * screen is visible, when the app returns to the foreground and when `expiresAt` passes. The app
 * never decides the state itself; polling stops once the booking leaves PENDING_PAYMENT.
 */
export function useBooking(id: string) {
  const queryClient = useQueryClient();
  const isFocused = useIsFocused();
  const [outcome, setOutcome] = useState<CheckoutOutcome | 'waiting' | null>(null);
  const confirming =
    outcome === 'success' || outcome === 'pending' || outcome === 'closed' || outcome === 'waiting';
  const query = useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => fetchBooking(id),
    staleTime: 0,
    refetchInterval: (q) => pollInterval(q.state.data?.status, isFocused, confirming),
  });
  const booking = query.data;

  // Seen going from pending to confirmed on this screen (the celebration, once).
  const previousStatus = useRef(booking?.status);
  const [justConfirmed, setJustConfirmed] = useState(false);
  useEffect(() => {
    if (previousStatus.current === 'PENDING_PAYMENT' && booking?.status === 'CONFIRMED')
      setJustConfirmed(true);
    previousStatus.current = booking?.status;
  }, [booking?.status]);

  // Countdown to expiresAt; at zero, ask the server instead of assuming EXPIRED.
  const countdown = useCountdown();
  const { start } = countdown;
  const pendingExpiry = booking?.status === 'PENDING_PAYMENT' ? booking.expiresAt : null;
  useEffect(() => {
    if (pendingExpiry) start(Math.max(0, Math.ceil((Date.parse(pendingExpiry) - Date.now()) / 1000)));
  }, [pendingExpiry, start]);
  const wasRunning = useRef(false);
  const { refetch } = query;
  useEffect(() => {
    if (wasRunning.current && !countdown.running && pendingExpiry) void refetch();
    wasRunning.current = countdown.running;
  }, [countdown.running, pendingExpiry, refetch]);

  // What the client may do comes from the API: the preview says if it can be cancelled.
  const preview = useQuery({
    queryKey: bookingKeys.preview(id),
    queryFn: () => fetchCancellationPreview(id),
    enabled: booking !== undefined,
    staleTime: 0,
  });
  const payment = useQuery({
    queryKey: bookingKeys.payment(id),
    queryFn: () => fetchPayment(id),
    enabled: booking?.status === 'CANCELLED',
  });

  // Pay: the backend starts the payment and says how to present it (clientAction). Whatever the
  // checkout page reports, the booking is read again: only its status confirms the payment.
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const pay = useMutation({
    mutationFn: async () => {
      const start = await startPayment(id);
      const next = checkoutFor(start.clientAction);
      if (!next) throw new PaymentUnavailableError();
      return next;
    },
    onMutate: () => setOutcome(null),
    onSuccess: (next) => {
      if (next.kind === 'wait') setOutcome('waiting');
      else setCheckout(next);
    },
  });
  const finishCheckout = (result: CheckoutOutcome) => {
    setCheckout(null);
    setOutcome(result);
    void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
  };

  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelled, setCancelled] = useState<CancelledBooking | null>(null);
  const cancel = useMutation({
    mutationFn: () => cancelBooking(id),
    onSuccess: (result) => {
      const { refund: _refund, ...detail } = result;
      queryClient.setQueryData<Booking>(bookingKeys.detail(id), detail);
      setCancelled(result);
      setConfirmingCancel(false);
      // Lists, preview, payment and freed slots update without a manual reload.
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });

  return {
    query,
    booking,
    /** Hours are always shown in the barbershop's zone, as the API sends it. */
    timeZone: booking?.barbershop.timezone,
    secondsLeft: countdown.secondsLeft,
    preview,
    canCancel: preview.data?.allowed === true,
    payment,
    justConfirmed,
    /** Opens the system dialog to add a confirmed booking to the phone calendar. */
    addToCalendar: () => {
      if (!booking) return;
      void addToCalendar({
        title: i18n.t('booking:calendar.title', {
          service: booking.service.name ?? '',
          shop: booking.barbershop.name ?? '',
        }),
        startAt: booking.startAt,
        endAt: booking.endAt,
        location: booking.barbershop.name ?? undefined,
      })
        .then((saved) => saved && showToast(i18n.t('common:calendar.added')))
        .catch(() => showToast(i18n.t('common:calendar.addFailed'), 'danger'));
    },
    /** Paying only makes sense for a pending booking that has not expired on screen. */
    canPay: booking?.status === 'PENDING_PAYMENT' && countdown.secondsLeft > 0,
    pay: () => pay.mutate(),
    isStartingPayment: pay.isPending,
    payError: pay.error
      ? pay.error instanceof PaymentUnavailableError
        ? i18n.t('booking:payment.unavailable')
        : translateError(pay.error).message
      : null,
    checkout,
    finishCheckout,
    /** What the last checkout reported (shown while the backend confirms), or null. */
    outcome: booking?.status === 'PENDING_PAYMENT' ? outcome : null,
    confirmingCancel,
    askCancel: () => {
      cancel.reset();
      setConfirmingCancel(true);
      void preview.refetch();
    },
    dismissCancel: () => setConfirmingCancel(false),
    confirmCancel: () => cancel.mutate(),
    isCancelling: cancel.isPending,
    cancelError: cancel.error ? translateError(cancel.error).message : null,
    cancelled,
  };
}

/** The gateway did not answer (clientAction null) or sent something the app cannot show. */
class PaymentUnavailableError extends Error {}

/** "Mis reservas": upcoming or history, cursor paginated. */
export function useMyBookings(scope: BookingScope) {
  const query = useInfiniteQuery({
    queryKey: bookingKeys.list(scope),
    queryFn: ({ pageParam }) => fetchMyBookings(scope, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: BookingPage) => nextPageParam(last),
    staleTime: 0,
  });
  return {
    items: query.data?.pages.flatMap((page) => page.items),
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isRefetching: query.isRefetching,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}
