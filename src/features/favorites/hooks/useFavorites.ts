import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { nextPageParam, translateError, useSession } from '@/shared/api';
import {
  addFavorite,
  favoritesKeys,
  fetchFavoritesPage,
  removeFavorite,
  type FavoritePage,
} from '../api/favoritesApi';

export interface UseFavoriteToggleOptions {
  /** `isFavorite` as the API returned it with the barbershop (false without a session). */
  isFavorite: boolean;
  /** Refreshes the barbershop data that owns `isFavorite`; the optimistic value waits for it. */
  onChanged?: () => Promise<unknown>;
}

/**
 * Heart of a barbershop. The state comes from the API (`isFavorite`); a tap shows the new state
 * at once and goes back if the request fails.
 */
export function useFavoriteToggle(barbershopId: string, { isFavorite, onChanged }: UseFavoriteToggleOptions) {
  const queryClient = useQueryClient();
  const authenticated = useSession((s) => s.status === 'authenticated');
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  const mutation = useMutation({
    mutationFn: (favorite: boolean) => (favorite ? addFavorite(barbershopId) : removeFavorite(barbershopId)),
    onMutate: (favorite) => setOptimistic(favorite),
    onSuccess: async () => {
      await onChanged?.();
    },
    onSettled: () => {
      setOptimistic(null);
      void queryClient.invalidateQueries({ queryKey: favoritesKeys.list });
    },
  });

  const current = optimistic ?? isFavorite;

  return {
    authenticated,
    isFavorite: authenticated && current,
    toggle: () => mutation.mutate(!current),
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
