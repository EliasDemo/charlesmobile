import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from './client';
import type { components } from './generated/schema';

/** A district of Peru with its INEI code (ubigeo). Names come without accents from the API. */
export type Location = components['schemas']['LocationDto'];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Districts matching `q` (the 1892 of Peru, at most 300 per answer). Public, cached a day. */
export function useDistrictSearch(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: ['locations', 'districts', term],
    queryFn: () =>
      unwrap(api.GET('/api/v1/locations/districts', { params: { query: term ? { q: term } : {} } })),
    staleTime: DAY_MS,
  });
}

/** "Juliaca · San Roman, Puno". */
export const locationLabel = (l: Location) => `${l.district} · ${l.province}, ${l.department}`;
