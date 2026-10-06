import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { colors, radius, spacing, typography, type ColorScheme, type ThemeColors } from './tokens';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemePreferenceState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

// Saved on the device with SecureStore (already in the build: no new native module).
// Not sensitive; it only needs to survive restarts.
const PREFERENCE_KEY = 'charles.themePreference';
const PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];

/** UI preference only (CLAUDE.md §2): never server data. */
export const useThemePreference = create<ThemePreferenceState>((set) => ({
  preference: 'system',
  setPreference: (preference) => {
    set({ preference });
    void SecureStore.setItemAsync(PREFERENCE_KEY, preference).catch(() => undefined);
  },
}));

/** Restores the saved preference at startup. Failures keep following the system. */
export async function loadThemePreference(): Promise<void> {
  try {
    const saved = await SecureStore.getItemAsync(PREFERENCE_KEY);
    if (saved && (PREFERENCES as readonly string[]).includes(saved)) {
      useThemePreference.setState({ preference: saved as ThemePreference });
    }
  } catch {
    // Keep the default.
  }
}

export interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
}

export function buildTheme(scheme: ColorScheme): Theme {
  return { scheme, colors: colors[scheme], spacing, radius, typography };
}

// Default value lets components render even outside the provider (e.g. the root error boundary).
const ThemeContext = createContext<Theme>(
  buildTheme(Appearance.getColorScheme() === 'light' ? 'light' : 'dark'),
);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const preference = useThemePreference((s) => s.preference);
  const scheme: ColorScheme = preference === 'system' ? (system === 'light' ? 'light' : 'dark') : preference;
  const theme = useMemo(() => buildTheme(scheme), [scheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
