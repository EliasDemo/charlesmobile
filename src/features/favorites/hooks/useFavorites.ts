import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAllPages, nextPageParam, translateError, useSession } from '@/shared/api';
import {
  addFavorite,
  favoritesKeys,
  fetchFavoriteIdsPage,
  fetchFavoritesPage,
  removeFavorite,
  type FavoritePage,
} from '../api/favoritesApi';

/**
 * Ids of the user's favorites. The API has no "is this a favorite?" field yet (requested to the
 * backend as `isFavorite`), so the whole list is read once and kept in cache.
 */
export function useFavoriteIds() {
  const authenticated = useSession((s) => s.status === 'authenticated');
  return useQuery({
    queryKey: favoritesKeys.ids,
    queryFn: async () => new Set((await fetchAllPages(fetchFavoriteIdsPage)).map((f) => f.barbershopId)),
    enabled: authenticated,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFavoriteToggle(barbershopId: string) {
  const queryClient = useQueryClient();
  const authenticated = useSession((s) => s.status === 'authenticated');
  const ids = useFavoriteIds();
  const isFavorite = ids.data?.has(barbershopId) ?? false;

  // Optimistic: the heart changes at once and goes back if the request fails.
  const mutation = useMutation({
    mutationFn: (favorite: boolean) => (favorite ? addFavorite(barbershopId) : removeFavorite(barbershopId)),
    onMutate: async (favorite) => {
      await queryClient.cancelQueries({ queryKey: favoritesKeys.ids });
      const previous = queryClient.getQueryData<Set<string>>(favoritesKeys.ids);
      const next = new Set(previous);
      if (favorite) next.add(barbershopId);
      else next.delete(barbershopId);
      queryClient.setQueryData(favoritesKeys.ids, next);
      return { previous };
    },
    onError: (_error, _favorite, context) => {
      if (context?.previous) queryClient.setQueryData(favoritesKeys.ids, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: favoritesKeys.list }),
  });

  return {
    authenticated,
    /** Unknown while the list loads: the button waits instead of guessing. */
    ready: !authenticated || ids.data !== undefined,
    isFavorite,
    toggle: () => mutation.mutate(!isFavorite),
    isSaving: mutation.isPending,
    error: mutation.error ? translateError(mutation.error).message : null,
  };
}

/** "Mis favoritas": most recent first, cursor paginated. */
export function useFavoritesList() {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: favoritesKeys.list,
    queryFn: ({ pageParam }) => fetchFavoritesPage(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: FavoritePage) => nextPageParam(last),
  });
  const remove = useMutation({
    mutationFn: removeFavorite,
    onSettled: () => queryClient.invalidateQueries({ queryKey: favoritesKeys.all }),
  });
  return {
    query: {
      items: query.data?.pages.flatMap((page) => page.items),
      error: query.error,
      hasNextPage: query.hasNextPage,
      isFetchingNextPage: query.isFetchingNextPage,
      isRefetching: query.isRefetching,
      fetchNextPage: query.fetchNextPage,
      refetch: query.refetch,
    },
    remove: (barbershopId: string) => remove.mutate(barbershopId),
    removingId: remove.isPending ? remove.variables : null,
    removeError: remove.error ? translateError(remove.error).message : null,
  };
}
