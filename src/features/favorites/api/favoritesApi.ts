import { api, unwrap, type components } from '@/shared/api';

export type Favorite = components['schemas']['FavoriteDto'];
export type FavoritePage = components['schemas']['FavoritePageDto'];

const LIST_PAGE_SIZE = 20;

export const favoritesKeys = {
  all: ['favorites'] as const,
  list: ['favorites', 'list'] as const,
};

export const fetchFavoritesPage = (cursor?: string, limit = LIST_PAGE_SIZE): Promise<FavoritePage> =>
  unwrap(api.GET('/api/v1/me/favorites', { params: { query: { limit, ...(cursor ? { cursor } : {}) } } }));

/** Idempotent (204). A barbershop that is not public answers 404. */
export const addFavorite = (barbershopId: string) =>
  unwrap(api.PUT('/api/v1/me/favorites/{barbershopId}', { params: { path: { barbershopId } } }));

/** Idempotent (204). */
export const removeFavorite = (barbershopId: string) =>
  unwrap(api.DELETE('/api/v1/me/favorites/{barbershopId}', { params: { path: { barbershopId } } }));
