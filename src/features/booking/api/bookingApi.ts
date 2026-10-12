import { api, unwrap, type components, type paths } from '@/shared/api';

export type DayAvailability = components['schemas']['DayAvailabilityDto'];
export type Slot = components['schemas']['SlotDto'];
export type Booking = components['schemas']['BookingDto'];
export type CreatedBooking = components['schemas']['CreatedBookingDto'];
export type BookingStatus = components['schemas']['BookingStatus'];
export type BookingPage = components['schemas']['BookingPageDto'];
export type CancellationPreview = components['schemas']['CancellationPreviewDto'];
export type CancelledBooking = components['schemas']['CancelledBookingDto'];
export type PaymentStatusView = components['schemas']['PaymentStatusDto'];
export type BookingScope = NonNullable<
  NonNullable<paths['/api/v1/me/bookings']['get']['parameters']['query']>['scope']
>;

export const BOOKINGS_PAGE_SIZE = 20;

export const bookingKeys = {
  all: ['bookings'] as const,
  lists: ['bookings', 'list'] as const,
  list: (scope: BookingScope) => ['bookings', 'list', scope] as const,
  detail: (id: string) => ['bookings', 'detail', id] as const,
  preview: (id: string) => ['bookings', 'detail', id, 'cancellation-preview'] as const,
  payment: (id: string) => ['bookings', 'detail', id, 'payment'] as const,
  availability: (barbershopId: string, serviceId: string, date: string, barberId: string | null) =>
    ['availability', barbershopId, serviceId, date, barberId] as const,
};

/** Slots of one local day of the barbershop. Without barber: any available barber. */
export const fetchAvailability = (
  barbershopId: string,
  serviceId: string,
  date: string,
  barberId: string | null,
): Promise<DayAvailability> =>
  unwrap(
    api.GET('/api/v1/barbershops/{id}/availability', {
      params: { path: { id: barbershopId }, query: { serviceId, date, ...(barberId ? { barberId } : {}) } },
    }),
  );

export interface CreateBookingInput {
  barbershopId: string;
  serviceId: string;
  /** Exactly the `startAt` of a slot returned by the availability. */
  startAt: string;
  barberId: string | null;
}

/**
 * The same `idempotencyKey` must be sent again when this attempt is retried: the backend then
 * returns the same booking (200) instead of creating another.
 */
export const createBooking = (input: CreateBookingInput, idempotencyKey: string): Promise<CreatedBooking> =>
  unwrap(
    api.POST('/api/v1/bookings', {
      params: { header: { 'Idempotency-Key': idempotencyKey } },
      body: {
        barbershopId: input.barbershopId,
        serviceId: input.serviceId,
        startAt: input.startAt,
        ...(input.barberId ? { barberId: input.barberId } : {}),
      },
    }),
  );

export const fetchBooking = (id: string): Promise<Booking> =>
  unwrap(api.GET('/api/v1/bookings/{id}', { params: { path: { id } } }));

export const fetchMyBookings = (scope: BookingScope, cursor?: string): Promise<BookingPage> =>
  unwrap(
    api.GET('/api/v1/me/bookings', {
      params: { query: { scope, limit: BOOKINGS_PAGE_SIZE, ...(cursor ? { cursor } : {}) } },
    }),
  );

/** Whether it can be cancelled now and how much would be refunded. Shown before confirming. */
export const fetchCancellationPreview = (id: string): Promise<CancellationPreview> =>
  unwrap(api.GET('/api/v1/bookings/{id}/cancellation-preview', { params: { path: { id } } }));

/** Client cancellation: no reason needed (only the barbershop must give one). */
export const cancelBooking = (id: string): Promise<CancelledBooking> =>
  unwrap(api.POST('/api/v1/bookings/{id}/cancel', { params: { path: { id } }, body: {} }));

/**
 * Starts (or retries) the payment of a pending booking. Idempotent: it also gives a new checkout
 * link when the previous one expired. `clientAction` may be null if the gateway did not answer.
 */
export const startPayment = (id: string) =>
  unwrap(api.POST('/api/v1/bookings/{id}/payment', { params: { path: { id } } }));

/** Payment and refunds of a booking (e.g. the refund of a cancelled one). */
export const fetchPayment = (id: string): Promise<PaymentStatusView> =>
  unwrap(api.GET('/api/v1/bookings/{id}/payment', { params: { path: { id } } }));
