import { api, unwrap, type components } from '@/shared/api';

type S = components['schemas'];
export type Placement = S['PublicPlacementDto'];
export type Sponsor = S['PublicSponsorDto'];
export type AdSlotKey =
  'home_banner' | 'search_top' | 'booking_success' | 'shop_dashboard' | 'store_featured';

export const adKeys = {
  slot: (slot: AdSlotKey) => ['ads', 'slot', slot] as const,
  sponsor: (id: string) => ['ads', 'sponsor', id] as const,
};

/** Up to 3 ads for a space (no session needed). Empty: the space is not shown. */
export const fetchPlacements = (slot: AdSlotKey): Promise<Placement[]> =>
  unwrap(api.GET('/api/v1/placements', { params: { query: { slot } } }));

/**
 * IMPRESSION when it is seen, CLICK when tapped. Without a session the installation's
 * `viewerKey` is required; repeats within the hour are ignored by the backend.
 */
export const sendPlacementEvent = (id: string, type: 'IMPRESSION' | 'CLICK', viewerKey?: string) =>
  unwrap(
    api.POST('/api/v1/placements/{id}/events', {
      params: { path: { id } },
      body: { type, ...(viewerKey ? { viewerKey } : {}) },
    }),
  );

export const fetchSponsor = (id: string): Promise<Sponsor> =>
  unwrap(api.GET('/api/v1/sponsors/{id}', { params: { path: { id } } }));

export type Store = S['StoreDto'];
export type StoreProduct = S['StoreProductDto'];
export type StoreBrand = S['StoreBrandDto'];
export type StoreVideo = S['StoreVideoDto'];
export type StoreDeal = S['StoreDealDto'];
export type StoreAudience = 'CLIENTS' | 'BARBERSHOPS';
export type StoreCategory = StoreBrand['category'];
/** A product as the store and the brand page send it (the brand page omits the brand fields). */
export type ProductLike = S['PublicProductDto'];

export const storeKeys = {
  store: (audience: StoreAudience, category?: StoreCategory) =>
    ['ads', 'store', audience, category ?? 'all'] as const,
};

/** The store window (public): featured ads, offers, products, brands, videos and booking deals. */
export const fetchStore = (audience: StoreAudience, category?: StoreCategory): Promise<Store> =>
  unwrap(api.GET('/api/v1/store', { params: { query: { audience, ...(category ? { category } : {}) } } }));

/** Counts "Ver en la tienda" before leaving the app (204). Without a session it needs `viewerKey`. */
export const sendProductClick = (id: string, viewerKey?: string) =>
  unwrap(
    api.POST('/api/v1/store/products/{id}/click', {
      params: { path: { id } },
      body: viewerKey ? { viewerKey } : {},
    }),
  );
