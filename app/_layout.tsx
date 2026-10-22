import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, router, usePathname, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSessionEndedRedirect } from '@/features/auth';
import { notificationTarget, useDeviceRegistration, usePushTaps } from '@/features/notifications';
import { loadAppMode, useAppMode } from '@/features/shop-management';
import { loadWelcomeSeen, useWelcomeStore } from '@/features/onboarding';
import { bootstrapSession, queryClient, startQueryListeners } from '@/shared/api';
import { env } from '@/shared/config';
import { i18n, loadLanguagePreference, useTranslation } from '@/shared/i18n';
import { ensureNotificationChannels, loadAppSettings } from '@/shared/lib';
import { ThemeProvider, loadThemePreference } from '@/shared/theme';
import {
  AuthPromptHost,
  BrandSplash,
  ErrorFallback,
  KeyboardRoot,
  NavigationThemeRoot,
  OfflineBanner,
  PlanLimitNotice,
  SystemBars,
  ToastHost,
  TourOverlay,
  UnlockHost,
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
  usePushTaps((resource, type) => {
    const target = notificationTarget(resource, type);
    if (target.kind === 'booking') router.push({ pathname: '/bookings/[id]', params: { id: target.id } });
    else if (target.kind === 'ticket') router.push({ pathname: '/support/[id]', params: { id: target.id } });
    else if (target.kind === 'support') router.push('/support');
    else if (target.kind === 'shopReviews') {
      useAppMode.getState().setMode('shop');
      router.push({ pathname: '/shop/[shopId]/reviews', params: { shopId: target.shopId } });
    } else if (target.kind === 'shop') {
      useAppMode.getState().setMode('shop');
      router.navigate('/shop');
    } else if (target.kind === 'conversation') {
      router.push({ pathname: '/messages/[id]', params: { id: target.id, resolve: '1' } });
    } else if (target.kind === 'myApplications') router.push('/jobs/applications');
    else if (target.kind === 'myPlan') {
      useAppMode.getState().setMode('shop');
      router.push('/my-plan');
    } else if (target.kind === 'myMemberships') router.push('/memberships');
    else if (target.kind === 'shopJobs') {
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
      <AuthPromptHost
        onLogin={(returnTo) => router.push({ pathname: '/login', params: { returnTo } })}
        onRegister={(returnTo) => router.push({ pathname: '/register', params: { returnTo } })}
      />
      <TourOverlay />
      <UnlockHost />
      <PlanLimitNotice
        onSeePlan={() => {
          useAppMode.getState().setMode('shop');
          router.push('/my-plan');
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [sessionReady, setSessionReady] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    void Promise.all([
      bootstrapSession(),
      loadThemePreference(),
      loadLanguagePreference(),
      loadWelcomeSeen(),
      loadAppMode(),
      loadAppSettings(),
      ensureNotificationChannels({
        default: i18n.t('notifications:channels.default'),
        bookings: i18n.t('notifications:channels.bookings'),
        messages: i18n.t('notifications:channels.messages'),
        payments: i18n.t('notifications:channels.payments'),
        promotions: i18n.t('notifications:channels.promotions'),
      }),
    ]).finally(() => setSessionReady(true));
  }, []);

  // Without the fonts the app still works with the system font.
  const ready = (fontsLoaded || fontError !== null) && sessionReady;
  // The native splash hands over at once to the animated one, which stays until the app is ready.
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);
  const [splashDone, setSplashDone] = useState(false);
  const finishSplash = useCallback(() => setSplashDone(true), []);

  if (env.configError) {
    return (
      <ThemeProvider>
        <SystemBars />
        <ErrorFallback title={t('config.title')} message={t(`config.${env.configError}`)} />
      </ThemeProvider>
    );
  }
  return (
    <GestureHandlerRootView style={rootStyle}>
      <SafeAreaProvider>
        <KeyboardRoot>
          <ThemeProvider>
            {ready ? (
              <NavigationThemeRoot>
                <QueryClientProvider client={queryClient}>
                  <AppStack />
                </QueryClientProvider>
              </NavigationThemeRoot>
            ) : null}
            {splashDone ? null : <BrandSplash ready={ready} onDone={finishSplash} />}
          </ThemeProvider>
        </KeyboardRoot>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const rootStyle = { flex: 1 };
