import { QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient, useSession } from '@/shared/api';
import * as SecureStore from 'expo-secure-store';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

// The app uses one QueryClient (shared/api); tests use it too so logout clears what screens read.
function Providers({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SafeAreaProvider>
  );
}

export const renderWithProviders = (ui: ReactElement) => render(ui, { wrapper: Providers });

export const renderHookWithProviders = <T,>(hook: () => T) => renderHook(hook, { wrapper: Providers });

/** Fresh state between tests: no session, no cache, empty secure storage. */
export function resetAppState() {
  queryClient.clear();
  queryClient.setDefaultOptions({
    queries: { retry: false, gcTime: Infinity },
    mutations: { retry: false, gcTime: Infinity },
  });
  useSession.setState({ status: 'anonymous', accessToken: null, user: null });
  (SecureStore as unknown as { __store: Map<string, string> }).__store.clear();
}

export function signIn(user: Partial<NonNullable<ReturnType<typeof useSession.getState>['user']>> = {}) {
  useSession.setState({
    status: 'authenticated',
    accessToken: 'access-1',
    user: {
      id: 'u1',
      fullName: 'Ana Pérez',
      username: 'ana.perez',
      emailVerified: true,
      roles: ['CLIENT'],
      ...user,
    },
  });
}
