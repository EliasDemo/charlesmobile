import type { ConfigContext, ExpoConfig } from 'expo/config';

// APP_VARIANT is set per build profile in eas.json. Local `expo start` defaults to development.
const variant = process.env.APP_VARIANT ?? 'development';
const isDevelopment = variant === 'development';

const BASE_ID = 'pe.charlesapp.mobile';
// EAS project of the charlesapp-pe organization. Filled after `eas init` (the ID is not a secret).
const EAS_PROJECT_ID: string = '';
// Google Maps key for Android, injected at build time from an EAS environment variable (never committed).
const GOOGLE_MAPS_ANDROID_API_KEY = process.env.GOOGLE_MAPS_ANDROID_API_KEY;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: isDevelopment ? 'Charles (dev)' : 'Charles',
  slug: 'charles',
  owner: 'charlesapp-pe',
  scheme: isDevelopment ? 'charles-dev' : 'charles',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier: isDevelopment ? `${BASE_ID}.dev` : BASE_ID,
    infoPlist: {
      // Plain HTTP to the local backend only in development builds.
      ...(isDevelopment
        ? { NSAppTransportSecurity: { NSAllowsLocalNetworking: true, NSAllowsArbitraryLoads: true } }
        : {}),
      NSCameraUsageDescription: 'Charles usa la cámara para escanear tu tarjeta al pagar.',
    },
  },
  android: {
    package: isDevelopment ? `${BASE_ID}.dev` : BASE_ID,
    adaptiveIcon: {
      backgroundColor: '#141210',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    'expo-status-bar',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 160,
        backgroundColor: '#F7F5F2',
        dark: { backgroundColor: '#141210' },
      },
    ],
    'expo-font',
    'expo-secure-store',
    'expo-localization',
    'expo-dev-client',
    // Cleartext (HTTP) traffic only in development builds, for the backend on the local network.
    ['expo-build-properties', { android: { usesCleartextTraffic: isDevelopment } }],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Charles usa tu ubicación solo para mostrarte barberías cercanas. No la guardamos.',
      },
    ],
    'expo-notifications',
    [
      'react-native-maps',
      GOOGLE_MAPS_ANDROID_API_KEY ? { androidGoogleMapsApiKey: GOOGLE_MAPS_ANDROID_API_KEY } : {},
    ],
    './plugins/withLyraPaymentSDK',
  ],
  experiments: { typedRoutes: true },
  extra: {
    appVariant: variant,
    ...(EAS_PROJECT_ID ? { eas: { projectId: EAS_PROJECT_ID } } : {}),
  },
});
