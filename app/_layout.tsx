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
import { useEffect, useRef, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { bootstrapSession, onSessionEnded, queryClient, startQueryListeners } from '@/shared/api';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/theme';
import {
  ErrorFallback,
  NavigationThemeRoot,
  OfflineBanner,
  SystemBars,
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

function AppStack() {
  const screenOptions = useStackScreenOptions();
  const { t } = useTranslation();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Renewal failed: clear cached data and go to login, keeping the destination screen.
  useEffect(
    () =>
      onSessionEnded(() => {
        queryClient.clear();
        router.replace({ pathname: '/login', params: { returnTo: pathnameRef.current } });
      }),
    [],
  );

  return (
    <>
      <SystemBars />
      <OfflineBanner />
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="(public)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(client)" options={{ headerShown: false }} />
        <Stack.Screen name="(staff)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ title: t('notFound.title') }} />
      </Stack>
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
    void bootstrapSession().finally(() => setSessionReady(true));
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
