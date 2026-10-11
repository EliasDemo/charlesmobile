import { api, unwrap, type components } from '@/shared/api';

type S = components['schemas'];
export type Agenda = S['AgendaDto'];
export type AgendaItem = S['AgendaItemDto'];
export type AgendaBlock = S['AgendaBlockDto'];
export type CorrectionBody = S['AttendanceCorrectionDto'];
export type CancelledBooking = S['CancelledBookingDto'];

export const agendaKeys = {
  all: ['agenda'] as const,
  shop: (shopId: string, date: string, barberId: string | null) =>
    ['agenda', 'shop', shopId, date, barberId ?? 'all'] as const,
  mine: (date: string) => ['agenda', 'mine', date] as const,
};

/** Day agenda of a barbershop (OWNER or MANAGER), optionally of one barber. */
export const fetchShopAgenda = (shopId: string, date: string, barberId: string | null): Promise<Agenda> =>
  unwrap(
    api.GET('/api/v1/barbershops/{id}/agenda', {
      params: { path: { id: shopId }, query: { date, ...(barberId ? { barberId } : {}) } },
    }),
  );

/** Day agenda of the account as a barber (its active profile). */
export const fetchMyAgenda = (date: string): Promise<Agenda> =>
  unwrap(api.GET('/api/v1/me/barber/agenda', { params: { query: { date } } }));

export const markAttended = (bookingId: string) =>
  unwrap(api.POST('/api/v1/bookings/{id}/attended', { params: { path: { id: bookingId } } }));

export const markNoShow = (bookingId: string) =>
  unwrap(api.POST('/api/v1/bookings/{id}/no-show', { params: { path: { id: bookingId } } }));

/** Cancellation by the barbershop: reason required, the backend refunds what was paid. */
export const cancelBooking = (bookingId: string, reason: string): Promise<CancelledBooking> =>
  unwrap(api.POST('/api/v1/bookings/{id}/cancel', { params: { path: { id: bookingId } }, body: { reason } }));

export const correctAttendance = (bookingId: string, body: CorrectionBody) =>
  unwrap(
    api.POST('/api/v1/bookings/{id}/attendance-correction', { params: { path: { id: bookingId } }, body }),
  );
