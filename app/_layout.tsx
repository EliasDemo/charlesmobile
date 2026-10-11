import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, router, usePathname, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSessionEndedRedirect } from '@/features/auth';
import { notificationTarget, useDeviceRegistration, usePushTaps } from '@/features/notifications';
import { loadAppMode, useAppMode } from '@/features/shop-management';
import { loadWelcomeSeen, useWelcomeStore } from '@/features/onboarding';
import { bootstrapSession, queryClient, startQueryListeners } from '@/shared/api';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { ThemeProvider, loadThemePreference } from '@/shared/theme';
import {
  ErrorFallback,
  NavigationThemeRoot,
  OfflineBanner,
  SystemBars,
  ToastHost,
  useStackScreenOptions,
} from '@/shared/ui';

void SplashScreen.preventAutoHideAsync();
startQueryListeners();

/** Global error boundary: a crashing screen shows a retry screen instead of a blank or closed app. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <ThemeProvider>
      <SystemBars />
      <ErrorFallback onRetry={() => void retry()} />
    </ThemeProvider>
  );
}

const goToLogin = (returnTo: string) => router.replace({ pathname: '/login', params: { returnTo } });

function AppStack() {
  const screenOptions = useStackScreenOptions();
  const { t } = useTranslation();
  const pathname = usePathname();
  // Renewal failed: go to login, keeping the destination screen.
  useSessionEndedRedirect(pathname, goToLogin);
  // Push: register this device while there is a session; a tapped push opens its screen.
  useDeviceRegistration();
  usePushTaps((resource) => {
    const target = notificationTarget(resource);
    if (target.kind === 'booking') router.push({ pathname: '/bookings/[id]', params: { id: target.id } });
    else if (target.kind === 'ticket') router.push({ pathname: '/support/[id]', params: { id: target.id } });
    else if (target.kind === 'support') router.push('/support');
    else if (target.kind === 'shop') {
      useAppMode.getState().setMode('shop');
      router.navigate('/shop');
    } else router.push('/notifications');
  });

  // First launch: the welcome pages, once.
  const welcomeSeen = useWelcomeStore((s) => s.seen);
  useEffect(() => {
    if (welcomeSeen === false) router.replace('/welcome');
  }, [welcomeSeen]);

  return (
    <>
      <SystemBars />
      <OfflineBanner />
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(public)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(client)" options={{ headerShown: false }} />
        <Stack.Screen name="(staff)" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="+not-found" options={{ title: t('notFound.title') }} />
      </Stack>
      <ToastHost />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [sessionReady, setSessionReady] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    void Promise.all([bootstrapSession(), loadThemePreference(), loadWelcomeSeen(), loadAppMode()]).finally(
      () => setSessionReady(true),
    );
  }, []);

  // Without the fonts the app still works with the system font.
  const ready = (fontsLoaded || fontError !== null) && sessionReady;
  useEffect(() => {
    if (ready || env.configError) void SplashScreen.hideAsync();
  }, [ready]);

  if (env.configError) {
    return (
      <ThemeProvider>
        <SystemBars />
        <ErrorFallback title={t('config.title')} message={t(`config.${env.configError}`)} />
      </ThemeProvider>
    );
  }
  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationThemeRoot>
          <QueryClientProvider client={queryClient}>
            <AppStack />
          </QueryClientProvider>
        </NavigationThemeRoot>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
