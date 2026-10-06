import { api, fetchAllPages, unwrap, type components } from '@/shared/api';

export type Barbershop = components['schemas']['BarbershopPublicDto'];
export type BusinessHours = components['schemas']['BusinessHoursDto'];
export type Service = components['schemas']['ServicePublicDto'];
export type Barber = components['schemas']['BarberPublicDto'];
export type Review = components['schemas']['PublicReviewDto'];
export type ReviewPage = components['schemas']['PublicReviewPageDto'];
export type NextAvailability = components['schemas']['NextAvailabilityDto'];
export type Alternatives = components['schemas']['AlternativesDto'];

/** Largest page the API allows: services and barbers of one shop fit in one or two requests. */
const FULL_LIST_PAGE = 100;
export const REVIEWS_PAGE_SIZE = 20;
export const LATEST_REVIEWS = 3;

export interface ReviewFilters {
  rating: number | null;
  barberId: string | null;
}

export const barbershopKeys = {
  detail: (id: string) => ['barbershop', id] as const,
  hours: (id: string) => ['barbershop', id, 'hours'] as const,
  services: (id: string) => ['barbershop', id, 'services'] as const,
  barbers: (id: string) => ['barbershop', id, 'barbers'] as const,
  latestReviews: (id: string) => ['barbershop', id, 'reviews', 'latest'] as const,
  reviews: (id: string, filters: ReviewFilters) => ['barbershop', id, 'reviews', filters] as const,
  nextSlot: (id: string, serviceId: string) => ['barbershop', id, 'next-slot', serviceId] as const,
  alternatives: (id: string, serviceId: string, date?: string) =>
    ['barbershop', id, 'alternatives', serviceId, date ?? null] as const,
};

const path = (id: string) => ({ params: { path: { id } } });

export const fetchBarbershop = (id: string): Promise<Barbershop> =>
  unwrap(api.GET('/api/v1/barbershops/{id}', path(id)));

export const fetchBusinessHours = (id: string): Promise<BusinessHours> =>
  unwrap(api.GET('/api/v1/barbershops/{id}/business-hours', path(id)));

export const fetchServices = (id: string): Promise<Service[]> =>
  fetchAllPages((cursor) =>
    unwrap(
      api.GET('/api/v1/barbershops/{id}/services', {
        params: { path: { id }, query: { limit: FULL_LIST_PAGE, ...(cursor ? { cursor } : {}) } },
      }),
    ),
  );

export const fetchBarbers = (id: string): Promise<Barber[]> =>
  fetchAllPages((cursor) =>
    unwrap(
      api.GET('/api/v1/barbershops/{id}/barbers', {
        params: { path: { id }, query: { limit: FULL_LIST_PAGE, ...(cursor ? { cursor } : {}) } },
      }),
    ),
  );

export const fetchReviews = (
  id: string,
  filters: ReviewFilters,
  cursor?: string,
  limit = REVIEWS_PAGE_SIZE,
): Promise<ReviewPage> =>
  unwrap(
    api.GET('/api/v1/barbershops/{id}/reviews', {
      params: {
        path: { id },
        query: {
          limit,
          ...(cursor ? { cursor } : {}),
          ...(filters.rating ? { rating: filters.rating } : {}),
          ...(filters.barberId ? { barberId: filters.barberId } : {}),
        },
      },
    }),
  );

export const fetchNextSlot = (id: string, serviceId: string): Promise<NextAvailability> =>
  unwrap(
    api.GET('/api/v1/barbershops/{id}/availability/next', { params: { path: { id }, query: { serviceId } } }),
  );

/** Other shops with a slot for a service of the same category (up to 5, closest first). */
export const fetchAlternatives = (id: string, serviceId: string, date?: string): Promise<Alternatives> =>
  unwrap(
    api.GET('/api/v1/barbershops/{id}/alternatives', {
      params: { path: { id }, query: { serviceId, ...(date ? { date } : {}) } },
    }),
  );
