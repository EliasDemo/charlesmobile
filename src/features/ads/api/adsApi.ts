import { api, unwrap, type components } from '@/shared/api';

type S = components['schemas'];
export type Placement = S['PublicPlacementDto'];
export type Sponsor = S['PublicSponsorDto'];
export type AdSlotKey = 'home_banner' | 'search_top' | 'booking_success' | 'shop_dashboard';

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
