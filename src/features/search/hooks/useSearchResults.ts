import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { fieldErrorsFrom, nextPageParam } from '@/shared/api';
import { useDebouncedValue } from '@/shared/lib';
import { fetchCategories, searchBarbershops, searchKeys, type SearchPage } from '../api/searchApi';
import { activeFilterCount, buildSearchParams, useSearchStore } from './searchStore';

const TYPING_DELAY_MS = 400;
/** Results that depend on the phone's position are not kept around (CLAUDE.md §5). */
const LOCATED_RESULTS_GC_MS = 5 * 60 * 1000;

export function useSearchResults() {
  const text = useSearchStore((s) => s.text);
  const filters = useSearchStore((s) => s.filters);
  const center = useSearchStore((s) => s.center);
  const rejectCenter = useSearchStore((s) => s.rejectCenter);
  const outsidePeru = useSearchStore((s) => s.outsidePeru);
  const debouncedText = useDebouncedValue(text, TYPING_DELAY_MS);
  const params = useMemo(
    () => buildSearchParams(debouncedText, filters, center),
    [debouncedText, filters, center],
  );

  const query = useInfiniteQuery({
    queryKey: searchKeys.results(params),
    queryFn: ({ pageParam }) => searchBarbershops(params, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: SearchPage) => nextPageParam(last),
    gcTime: center ? LOCATED_RESULTS_GC_MS : undefined,
  });

  // The backend only accepts coordinates inside Peru: fall back to a search without them.
  const coordinatesRejected = (() => {
    const fields = fieldErrorsFrom(query.error);
    return 'lat' in fields || 'lng' in fields;
  })();
  useEffect(() => {
    if (coordinatesRejected && center) rejectCenter();
  }, [coordinatesRejected, center, rejectCenter]);

  const items = query.data?.pages.flatMap((page) => page.items);
  return {
    query: {
      items,
      error: query.error,
      hasNextPage: query.hasNextPage,
      isFetchingNextPage: query.isFetchingNextPage,
      isRefetching: query.isRefetching,
      fetchNextPage: query.fetchNextPage,
      refetch: query.refetch,
    },
    /** The server stopped evaluating barbershops before filling the page (availability filters). */
    evaluationLimitReached: query.data?.pages.at(-1)?.evaluationLimitReached ?? false,
    textTooShort: text.trim().length > 0 && text.trim().length < 2,
    activeFilters: activeFilterCount(filters),
    usingDefaultOrder: !params.q && !center && !filters.sort,
    outsidePeru,
  };
}

export function useCategories() {
  return useQuery({ queryKey: searchKeys.categories, queryFn: fetchCategories, staleTime: 60 * 60 * 1000 });
}
