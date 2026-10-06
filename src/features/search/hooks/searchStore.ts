import { create } from 'zustand';
import type { Coordinates } from '@/shared/lib';
import type { BarbershopType, SearchParams } from '../api/searchApi';
import { PRICE_PRESETS, type PricePresetId } from '../config/pricePresets';

export type SortOption = NonNullable<SearchParams['sort']>;
export const RATING_OPTIONS = [3, 4, 4.5] as const;
export const RADIUS_OPTIONS_KM = [2, 5, 10, 25] as const;
/** Documented limits of `q`: 2 to 80 characters. */
export const QUERY_MIN = 2;
export const QUERY_MAX = 80;

export interface SearchFilters {
  category: string | null;
  pricePreset: PricePresetId | null;
  minRating: number | null;
  type: BarbershopType | null;
  openNow: boolean;
  availableNow: boolean;
  /** Calendar day YYYY-MM-DD. */
  date: string | null;
  /** null = backend default (distance with location, rating without). */
  sort: SortOption | null;
  radiusKm: number | null;
}

/** Where the search is centered: the phone (after permission) or the visible map area. */
export interface SearchCenter extends Coordinates {
  source: 'device' | 'map';
}

export const EMPTY_FILTERS: SearchFilters = {
  category: null,
  pricePreset: null,
  minRating: null,
  type: null,
  openNow: false,
  availableNow: false,
  date: null,
  sort: null,
  radiusKm: null,
};

interface SearchState {
  text: string;
  filters: SearchFilters;
  /** Only in memory: never persisted or logged (CLAUDE.md §5). */
  center: SearchCenter | null;
  view: 'list' | 'map';
  /** The backend rejected the coordinates (outside Peru): the search went on without them. */
  outsidePeru: boolean;
  rejectCenter: () => void;
  setText: (text: string) => void;
  setFilters: (filters: SearchFilters) => void;
  setCategory: (category: string | null) => void;
  setCenter: (center: SearchCenter | null) => void;
  setView: (view: 'list' | 'map') => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  text: '',
  filters: EMPTY_FILTERS,
  center: null,
  view: 'list',
  outsidePeru: false,
  rejectCenter: () =>
    set((s) => ({
      center: null,
      outsidePeru: true,
      filters: { ...s.filters, sort: s.filters.sort === 'distance' ? null : s.filters.sort },
    })),
  setText: (text) => set({ text: text.slice(0, QUERY_MAX) }),
  setFilters: (filters) => set({ filters }),
  setCategory: (category) => set((s) => ({ filters: { ...s.filters, category } })),
  setCenter: (center) =>
    set((s) => ({
      center,
      outsidePeru: center ? false : s.outsidePeru,
      // Distance only makes sense with a center.
      filters: center
        ? s.filters
        : { ...s.filters, sort: s.filters.sort === 'distance' ? null : s.filters.sort },
    })),
  setView: (view) => set({ view }),
}));

/** Turns the screen state into API query params. Pure: tested on its own. */
export function buildSearchParams(
  text: string,
  filters: SearchFilters,
  center: SearchCenter | null,
): SearchParams {
  const params: SearchParams = {};
  const q = text.trim();
  if (q.length >= QUERY_MIN) params.q = q.slice(0, QUERY_MAX);
  if (center) {
    params.lat = center.latitude;
    params.lng = center.longitude;
    if (filters.radiusKm) params.radiusKm = filters.radiusKm;
  }
  if (filters.category) params.category = filters.category;
  const preset = PRICE_PRESETS.find((p) => p.id === filters.pricePreset);
  if (preset && 'minPrice' in preset) params.minPrice = preset.minPrice;
  if (preset && 'maxPrice' in preset) params.maxPrice = preset.maxPrice;
  if (filters.minRating) params.minRating = filters.minRating;
  if (filters.type) params.type = filters.type;
  if (filters.openNow) params.openNow = true;
  if (filters.availableNow) params.availableNow = true;
  if (filters.date) params.date = filters.date;
  if (filters.sort && (filters.sort !== 'distance' || center)) params.sort = filters.sort;
  return params;
}

/** Filters chosen in the Filters screen (the category chip on Explore does not count). */
export function activeFilterCount(filters: SearchFilters): number {
  const { category: _category, ...rest } = filters;
  return Object.values(rest).filter((value) => value !== null && value !== false).length;
}
