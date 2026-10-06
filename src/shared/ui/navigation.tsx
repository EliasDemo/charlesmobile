import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
  type Theme as NavigationTheme,
} from 'expo-router';
import { requireOptionalNativeModule } from 'expo';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { useTheme, type Theme } from '@/shared/theme';

export function buildNavigationTheme(theme: Theme): NavigationTheme {
  const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    dark: theme.scheme === 'dark',
    colors: {
      ...base.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.textPrimary,
      border: theme.colors.border,
      notification: theme.colors.danger,
    },
  };
}

/** Header style shared by every stack, so no screen falls back to the default white header. */
export function useStackScreenOptions() {
  const theme = useTheme();
  return useMemo(
    () => ({
      headerStyle: { backgroundColor: theme.colors.surface },
      headerTintColor: theme.colors.textPrimary,
      headerTitleStyle: { ...theme.typography.subtitle, color: theme.colors.textPrimary },
      contentStyle: { backgroundColor: theme.colors.background },
      headerShadowVisible: false,
      headerBackButtonDisplayMode: 'minimal' as const,
    }),
    [theme],
  );
}

type NavigationBarModule = typeof import('expo-navigation-bar');

/**
 * expo-navigation-bar is optional: builds made before it was added do not contain its native
 * module, and importing the library there would crash. Only load it when the native side exists;
 * otherwise the system keeps its default navigation bar and nothing else changes.
 */
export function loadNavigationBar(): NavigationBarModule | null {
  if (Platform.OS !== 'android' || !requireOptionalNativeModule('ExpoNavigationBar')) return null;
  // Conditional require on purpose: a static import would crash builds without the module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-navigation-bar') as NavigationBarModule;
}

/**
 * Status bar, Android navigation bar and root background follow the theme tokens.
 * With edge-to-edge the bars are transparent: only their icon color has to change.
 */
export function SystemBars() {
  const theme = useTheme();
  const iconStyle = theme.scheme === 'dark' ? 'light' : 'dark';
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.background);
    loadNavigationBar()?.setStyle(theme.scheme === 'dark' ? 'dark' : 'light');
  }, [theme]);
  return <StatusBar style={iconStyle} />;
}

/** Applies the theme to every navigator (headers, backgrounds, transitions). */
export function NavigationThemeRoot({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const navigationTheme = useMemo(() => buildNavigationTheme(theme), [theme]);
  return <NavigationThemeProvider value={navigationTheme}>{children}</NavigationThemeProvider>;
}
