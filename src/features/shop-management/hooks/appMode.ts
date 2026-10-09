import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { useSession } from '@/shared/api';

export type AppMode = 'client' | 'shop';

// UI preference on the device (SecureStore is already in the build). Not sensitive.
const MODE_KEY = 'charles.appMode';

interface AppModeState {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  /** Barbershop being managed, when the account manages several. Memory only. */
  selectedShopId: string | null;
  selectShop: (id: string) => void;
}

export const useAppMode = create<AppModeState>((set) => ({
  mode: 'client',
  setMode: (mode) => {
    set({ mode });
    void SecureStore.setItemAsync(MODE_KEY, mode).catch(() => undefined);
  },
  selectedShopId: null,
  selectShop: (selectedShopId) => set({ selectedShopId }),
}));

export async function loadAppMode(): Promise<void> {
  try {
    const saved = await SecureStore.getItemAsync(MODE_KEY);
    if (saved === 'shop' || saved === 'client') useAppMode.setState({ mode: saved });
  } catch {
    // Keep client mode.
  }
}

/**
 * Whether the account can use the barbershop mode, from the roles in the session (CLAUDE.md §7).
 * The backend still authorizes every action.
 */
export function useCanManage(): boolean {
  return useSession((s) => s.user?.roles.some((role) => role === 'OWNER' || role === 'BARBER') ?? false);
}

/** Mode actually shown: barbershop mode only for accounts that can use it. */
export function useEffectiveMode(): AppMode {
  const mode = useAppMode((s) => s.mode);
  const canManage = useCanManage();
  const authenticated = useSession((s) => s.status === 'authenticated');
  return mode === 'shop' && canManage && authenticated ? 'shop' : 'client';
}
