import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

// Stored with SecureStore (already in the build). Not sensitive; it only survives restarts.
const SEEN_KEY = 'charles.welcomeSeen';

interface WelcomeState {
  /** null until read from the device at startup. */
  seen: boolean | null;
  markSeen: () => void;
}

export const useWelcomeStore = create<WelcomeState>((set) => ({
  seen: null,
  markSeen: () => {
    set({ seen: true });
    void SecureStore.setItemAsync(SEEN_KEY, 'true').catch(() => undefined);
  },
}));

/** Reads at startup whether the welcome was already shown. A read error counts as "seen". */
export async function loadWelcomeSeen(): Promise<void> {
  try {
    useWelcomeStore.setState({ seen: (await SecureStore.getItemAsync(SEEN_KEY)) === 'true' });
  } catch {
    useWelcomeStore.setState({ seen: true });
  }
}

export const WELCOME_PAGES = [
  { key: 'find', icon: 'search' },
  { key: 'book', icon: 'calendar' },
  { key: 'face', icon: 'happy' },
  { key: 'manage', icon: 'heart' },
] as const;

/** How the person wants to use Charles (the last welcome page). */
export type WelcomeChoice = 'client' | 'shop' | 'barber';
