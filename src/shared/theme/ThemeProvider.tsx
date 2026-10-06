import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { create } from 'zustand';
import { colors, radius, spacing, typography, type ColorScheme, type ThemeColors } from './tokens';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemePreferenceState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

/** UI preference only. Persistence and the manual selector arrive in M2. */
export const useThemePreference = create<ThemePreferenceState>((set) => ({
  preference: 'system',
  setPreference: (preference) => set({ preference }),
}));

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
