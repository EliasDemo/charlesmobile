import { api, unwrap, type components, type paths } from '@/shared/api';

export type SearchResult = components['schemas']['SearchResultDto'];
export type SearchPage = components['schemas']['SearchPageDto'];
export type ServiceCategory = components['schemas']['ServiceCategoryDto'];
export type BarbershopType = components['schemas']['BarbershopType'];
export type SearchParams = NonNullable<paths['/api/v1/search/barbershops']['get']['parameters']['query']>;

export const PAGE_SIZE = 20;

export const searchKeys = {
  all: ['search'] as const,
  results: (params: SearchParams) => ['search', 'results', params] as const,
  categories: ['service-categories'] as const,
};

/** Public: no session needed. Coordinates are sent but never stored by the backend. */
export const searchBarbershops = (params: SearchParams, cursor?: string): Promise<SearchPage> =>
  unwrap(
    api.GET('/api/v1/search/barbershops', {
      params: { query: { ...params, limit: PAGE_SIZE, ...(cursor ? { cursor } : {}) } },
    }),
  );

export const fetchCategories = (): Promise<ServiceCategory[]> =>
  unwrap(api.GET('/api/v1/service-categories')).then((list) => list.items);
