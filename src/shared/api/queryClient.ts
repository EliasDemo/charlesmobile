import NetInfo from '@react-native-community/netinfo';
import { MutationCache, QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';
import { isApiError } from './errors';
import { notePlanLimit } from './planLimit';

/**
 * Retries already happen inside the API fetch (network, 503 retryable, 429), so queries only
 * add one more try for network-level failures and never retry 4xx.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    mutationCache: new MutationCache({ onError: notePlanLimit }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 24 * 60 * 60 * 1000,
        retry: (failureCount, error) => !isApiError(error) && failureCount < 1,
        networkMode: 'offlineFirst',
      },
      mutations: { retry: false, networkMode: 'offlineFirst' },
    },
  });
}

export const queryClient = createQueryClient();

let listenersStarted = false;
/** Connects TanStack Query to the device connectivity and app foreground state. */
export function startQueryListeners(): void {
  if (listenersStarted) return;
  listenersStarted = true;
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
  );
  AppState.addEventListener('change', (status: AppStateStatus) =>
    focusManager.setFocused(status === 'active'),
  );
}
