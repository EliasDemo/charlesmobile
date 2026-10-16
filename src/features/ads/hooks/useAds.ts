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
  sendPlacementEvent,
  type AdSlotKey,
  type Placement,
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

/** The ads of a space; each one counts its impression once while shown. */
export function useAdSlot(slot: AdSlotKey) {
  const authenticated = useSession((s) => s.status === 'authenticated');
  const query = useQuery({
    queryKey: adKeys.slot(slot),
    queryFn: () => fetchPlacements(slot),
    staleTime: 300_000,
  });
  const seen = useRef(new Set<string>());
  const items = useMemo(() => query.data ?? [], [query.data]);
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

export function useSponsor(id: string) {
  return useQuery({ queryKey: adKeys.sponsor(id), queryFn: () => fetchSponsor(id) });
}
