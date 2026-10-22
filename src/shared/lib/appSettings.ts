import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

/** Interface preferences of this device (not personal data): sounds, vibration, tutorial. */
export interface AppSettings {
  sounds: boolean;
  haptics: boolean;
  /** Tours already seen (the first time on each tab). */
  toursSeen: string[];
}

const KEY = 'charles.appSettings';
const DEFAULTS: AppSettings = { sounds: true, haptics: true, toursSeen: [] };

interface SettingsState extends AppSettings {
  set: (patch: Partial<AppSettings>) => void;
  markTour: (id: string) => void;
  resetTours: () => void;
}

const persist = (state: AppSettings) =>
  void SecureStore.setItemAsync(KEY, JSON.stringify(state)).catch(() => undefined);

export const useAppSettings = create<SettingsState>((set, get) => {
  const save = (patch: Partial<AppSettings>) => {
    set(patch);
    const { sounds, haptics, toursSeen } = get();
    persist({ sounds, haptics, toursSeen });
  };
  return {
    ...DEFAULTS,
    set: save,
    markTour: (id) => save({ toursSeen: [...new Set([...get().toursSeen, id])] }),
    resetTours: () => save({ toursSeen: [] }),
  };
});

/** Reads the saved preferences at start (defaults when there are none or they can't be read). */
export async function loadAppSettings(): Promise<void> {
  try {
    const saved = await SecureStore.getItemAsync(KEY);
    if (saved) useAppSettings.setState({ ...DEFAULTS, ...(JSON.parse(saved) as Partial<AppSettings>) });
  } catch {
    // Keep the defaults.
  }
}
