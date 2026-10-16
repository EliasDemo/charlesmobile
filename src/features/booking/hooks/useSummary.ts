import { useBarbersQuery, useBarbershopQuery, useServicesQuery } from '@/features/barbershop';
import { useSession } from '@/shared/api';
import { useBookingDraft } from './bookingDraft';
import { useConfirmBooking, type UseConfirmBookingOptions } from './useConfirmBooking';
import { useQuote } from './useQuote';

/** Summary before confirming: what was chosen, from cached data, plus the confirm action. */
export function useSummary(options: UseConfirmBookingOptions) {
  const draft = useBookingDraft();
  const authenticated = useSession((s) => s.status === 'authenticated');
  const shop = useBarbershopQuery(draft.barbershopId ?? undefined);
  const services = useServicesQuery(draft.barbershopId ?? undefined);
  const barbers = useBarbersQuery(draft.barbershopId ?? undefined);
  const quote = useQuote();
  const confirm = useConfirmBooking({
    ...options,
    couponCode: quote.bookingCoupon,
    onCouponRejected: quote.rejectCoupon,
  });
  return {
    ...confirm,
    quote,
    authenticated,
    shop: shop.data,
    service: services.data?.find((s) => s.id === draft.serviceId),
    barberName: draft.barberId ? barbers.data?.find((b) => b.id === draft.barberId)?.displayName : undefined,
    slot: draft.slot,
  };
}
