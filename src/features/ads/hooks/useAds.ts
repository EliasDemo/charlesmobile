import { useQuery } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useMemo, useRef } from 'react';
import { useSession } from '@/shared/api';
import { openWebUrl } from '@/shared/lib';
import {
  adKeys,
  fetchPlacements,
  fetchSponsor,
  fetchStore,
  sendPlacementEvent,
  sendProductClick,
  storeKeys,
  type AdSlotKey,
  type Placement,
  type StoreAudience,
  type StoreCategory,
} from '../api/adsApi';

// One per installation, created once and kept (not a person's data: it only counts views).
const VIEWER_KEY = 'charles.viewerKey';
let viewerKey: Promise<string> | null = null;

/** The installation's UUID for ad events without a session (never a new one per request). */
export function getViewerKey(): Promise<string> {
  viewerKey ??= (async () => {
    const saved = await SecureStore.getItemAsync(VIEWER_KEY).catch(() => null);
    if (saved) return saved;
    const created = randomUUID();
    await SecureStore.setItemAsync(VIEWER_KEY, created).catch(() => undefined);
    return created;
  })();
  return viewerKey;
}

async function track(placement: Placement, type: 'IMPRESSION' | 'CLICK', authenticated: boolean) {
  const key = authenticated ? undefined : await getViewerKey();
  await sendPlacementEvent(placement.id, type, key).catch(() => undefined);
}

/** Counts each ad's impression once while it is on screen. */
function usePlacements(placements: Placement[] | undefined) {
  const authenticated = useSession((s) => s.status === 'authenticated');
  const seen = useRef(new Set<string>());
  const items = useMemo(() => placements ?? [], [placements]);
  useEffect(() => {
    for (const placement of items) {
      if (seen.current.has(placement.id)) continue;
      seen.current.add(placement.id);
      void track(placement, 'IMPRESSION', authenticated);
    }
  }, [items, authenticated]);
  return {
    items,
    /** Counts the click and opens the sponsor's page outside the app. */
    open: (placement: Placement) => {
      void track(placement, 'CLICK', authenticated);
      if (placement.actionUrl) void openWebUrl(placement.actionUrl).catch(() => undefined);
    },
  };
}

/** The ads of a space; each one counts its impression once while shown. */
export function useAdSlot(slot: AdSlotKey) {
  const query = useQuery({
    queryKey: adKeys.slot(slot),
    queryFn: () => fetchPlacements(slot),
    staleTime: 300_000,
  });
  return usePlacements(query.data);
}

/** "Ver en la tienda": counts the click first (never blocks on it), then opens the brand's shop. */
export function useOpenProduct() {
  const authenticated = useSession((s) => s.status === 'authenticated');
  return (product: { id: string; actionUrl: string }) => {
    void (async () => {
      const key = authenticated ? undefined : await getViewerKey();
      await sendProductClick(product.id, key).catch(() => undefined);
    })();
    void openWebUrl(product.actionUrl).catch(() => undefined);
  };
}

/** The store for clients or for barbershops, filtered by one category (or all). */
export function useStore(audience: StoreAudience, category?: StoreCategory) {
  const query = useQuery({
    queryKey: storeKeys.store(audience, category),
    queryFn: () => fetchStore(audience, category),
    staleTime: 300_000,
    placeholderData: (previous) => previous,
  });
  const featured = usePlacements(query.data?.featured);
  return { query, featured, openProduct: useOpenProduct() };
}

export function useSponsor(id: string) {
  return useQuery({ queryKey: adKeys.sponsor(id), queryFn: () => fetchSponsor(id) });
}
