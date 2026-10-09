import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useBarbershopQuery, useServicesQuery } from '@/features/barbershop';
import { nextPageParam, translateError } from '@/shared/api';
import { useCountdown } from '@/shared/lib';
import {
  bookingKeys,
  cancelBooking,
  fetchBooking,
  fetchCancellationPreview,
  fetchMyBookings,
  fetchPayment,
  type Booking,
  type BookingPage,
  type BookingScope,
  type CancelledBooking,
} from '../api/bookingApi';

/** While a booking waits for payment, its real state is read this often (only on screen). */
export const PENDING_POLL_MS = 10_000;

/** Poll only a pending booking, only while its screen is visible; final states stop it. */
export function pollInterval(status: Booking['status'] | undefined, screenVisible: boolean): number | false {
  return status === 'PENDING_PAYMENT' && screenVisible ? PENDING_POLL_MS : false;
}

/**
 * One booking, always as the backend says. A pending one is read again every 10 s while the
 * screen is visible, when the app returns to the foreground and when `expiresAt` passes. The app
 * never decides the state itself; polling stops once the booking leaves PENDING_PAYMENT.
 */
export function useBooking(id: string) {
  const queryClient = useQueryClient();
  const isFocused = useIsFocused();
  const query = useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => fetchBooking(id),
    staleTime: 0,
    refetchInterval: (q) => pollInterval(q.state.data?.status, isFocused),
  });
  const booking = query.data;
  const shop = useBarbershopQuery(booking?.barbershop.id);

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
    timeZone: shop.data?.timezone,
    timeZoneError: shop.error,
    secondsLeft: countdown.secondsLeft,
    preview,
    canCancel: preview.data?.allowed === true,
    payment,
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

/**
 * Zone of a booking's barbershop. BookingDto does not carry it yet (requested to the backend as
 * `barbershop.timezone`): read from the barbershop detail, cached per barbershop.
 */
export function useBookingTimeZone(barbershopId: string) {
  return useBarbershopQuery(barbershopId).data?.timezone;
}

/**
 * Category of the booked service. BookingDto only has the service id and name (requested to the
 * backend as `service.categoryKey`): looked up in the barbershop's services, cached. A service
 * that no longer exists returns null (generic icon).
 */
export function useBookingCategory(barbershopId: string, serviceId: string): string | null {
  return useServicesQuery(barbershopId).data?.find((s) => s.id === serviceId)?.category.key ?? null;
}
