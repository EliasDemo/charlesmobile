import { api, isApiError, unwrap, type components } from '@/shared/api';

type S = components['schemas'];
export type BarberProfile = S['BarberProfileDto'];
export type Workplace = S['WorkplaceDto'];
export type UpsertProfileBody = S['UpsertBarberProfileDto'];
export type PortfolioItem = S['PortfolioItemDto'];
export type PortfolioPage = S['PortfolioPageDto'];
export type ProfileReview = S['ProfileReviewDto'];
export type ProfileReviewPage = S['ProfileReviewPageDto'];
export type RankedBarber = S['RankedBarberDto'];
export type RankingPage = S['RankingPageDto'];
export type RankingFilters = {
  style?: string;
  district?: string;
  province?: string;
  q?: string;
  availableForWork?: boolean;
  sort?: 'ranking' | 'newest';
};

export const careerKeys = {
  all: ['career'] as const,
  mine: ['career', 'me'] as const,
  profile: (id: string) => ['career', 'profile', id] as const,
  portfolio: (id: string, style?: string) => ['career', 'portfolio', id, style ?? ''] as const,
  reviews: (id: string) => ['career', 'reviews', id] as const,
  ranking: (filters: RankingFilters) => ['career', 'ranking', filters] as const,
};

const PAGE = 20;
const multipart = { bodySerializer: (body: unknown) => body as FormData };

/** The account's professional profile, or null when it has none yet (404). */
export async function fetchMyProfile(): Promise<BarberProfile | null> {
  try {
    return await unwrap(api.GET('/api/v1/me/barber-profile'));
  } catch (error) {
    if (isApiError(error) && error.status === 404) return null;
    throw error;
  }
}

/** Creating it grants the BARBER role: renew the session afterwards to see it in the token. */
export const saveMyProfile = (body: UpsertProfileBody): Promise<BarberProfile> =>
  unwrap(api.PUT('/api/v1/me/barber-profile', { body }));

/** Up to 10 styles. */
export const saveSpecialties = (styleIds: string[]): Promise<BarberProfile> =>
  unwrap(api.PUT('/api/v1/me/barber-profile/specialties', { body: { styleIds } }));

export const uploadProfilePhoto = (form: FormData) =>
  unwrap(api.PUT('/api/v1/me/barber-profile/photo', { body: form as never, ...multipart }));

export const deleteProfilePhoto = () => unwrap(api.DELETE('/api/v1/me/barber-profile/photo'));

/** Multipart: `file`, `consent=true` (the person photographed agreed), `caption?`, `styleIds?`. */
export const uploadPortfolioItem = (form: FormData): Promise<PortfolioItem> =>
  unwrap(api.POST('/api/v1/me/barber-profile/portfolio', { body: form as never, ...multipart }));

export const deletePortfolioItem = (imageId: string) =>
  unwrap(api.DELETE('/api/v1/me/barber-profile/portfolio/{imageId}', { params: { path: { imageId } } }));

/** Ends the link with that barbershop (it is kept as past). 409 HAS_FUTURE_BOOKINGS if any. */
export const leaveWorkplace = (barberId: string): Promise<BarberProfile> =>
  unwrap(
    api.POST('/api/v1/me/barber-profile/workplaces/{barberId}/leave', { params: { path: { barberId } } }),
  );

export const fetchProfile = (id: string): Promise<BarberProfile> =>
  unwrap(api.GET('/api/v1/barber-profiles/{id}', { params: { path: { id } } }));

export const fetchPortfolio = (id: string, cursor?: string, style?: string): Promise<PortfolioPage> =>
  unwrap(
    api.GET('/api/v1/barber-profiles/{id}/portfolio', {
      params: {
        path: { id },
        query: { limit: PAGE, ...(cursor ? { cursor } : {}), ...(style ? { style } : {}) },
      },
    }),
  );

export const fetchProfileReviews = (id: string, cursor?: string): Promise<ProfileReviewPage> =>
  unwrap(
    api.GET('/api/v1/barber-profiles/{id}/reviews', {
      params: { path: { id }, query: { limit: PAGE, ...(cursor ? { cursor } : {}) } },
    }),
  );

/** Paginated by offset (`nextOffset`), not by cursor. */
export const fetchRanking = (filters: RankingFilters, offset = 0): Promise<RankingPage> =>
  unwrap(
    api.GET('/api/v1/barbers/ranking', {
      params: {
        query: {
          limit: PAGE,
          offset,
          ...(filters.style ? { style: filters.style } : {}),
          ...(filters.district?.trim() ? { district: filters.district.trim() } : {}),
          ...(filters.province ? { province: filters.province } : {}),
          ...(filters.q?.trim() ? { q: filters.q.trim() } : {}),
          ...(filters.availableForWork ? { availableForWork: true } : {}),
          ...(filters.sort ? { sort: filters.sort } : {}),
        },
      },
    }),
  );
