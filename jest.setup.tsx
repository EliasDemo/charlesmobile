// Tests never hit a real backend: every response is mocked from the generated types.
process.env.EXPO_PUBLIC_API_URL = 'http://api.test';

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY',
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    __store: store,
  };
});

// TanStack Query notifies observers on a timer; run it synchronously so updates stay inside act().
require('@tanstack/react-query').notifyManager.setScheduler((callback: () => void) => callback());

// react-native-maps needs its native module at import time; tests render a plain view instead.
jest.mock('react-native-maps', () => {
  const { View } = jest.requireActual('react-native');
  const MapView = (props: object) => <View testID="results-map" {...props} />;
  return { __esModule: true, default: MapView, Marker: () => null };
});

// expo-crypto's native randomUUID is not available in Jest: use Node's.
jest.mock('expo-crypto', () => ({ randomUUID: () => require('node:crypto').randomUUID() }));

// expo-notifications needs the native module: by default, never asked and no token.
jest.mock('expo-notifications', () => ({
  PermissionStatus: { GRANTED: 'granted', UNDETERMINED: 'undetermined', DENIED: 'denied' },
  getPermissionsAsync: jest.fn(async () => ({ status: 'undetermined', granted: false, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'denied', granted: false, canAskAgain: false })),
  getExpoPushTokenAsync: jest.fn(async () => {
    throw new Error('no push in tests');
  }),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// react-native-webview registers its native module on import: tests use a plain view instead.
jest.mock('react-native-webview', () => {
  const { View } = jest.requireActual('react-native');
  return { WebView: (props: object) => <View testID="webview" {...props} /> };
});

// expo-calendar's system dialog is native.
jest.mock('expo-calendar/legacy', () => ({
  createEventInCalendarAsync: jest.fn(async () => ({ action: 'saved' })),
}));

// Gestures and Reanimated need their native parts: use their official test setups.
require('react-native-gesture-handler/jestSetup');
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Blur and gradients are native views: plain views in tests.
jest.mock('expo-blur', () => {
  const { View } = jest.requireActual('react-native');
  return { BlurView: View };
});
jest.mock('expo-linear-gradient', () => {
  const { View } = jest.requireActual('react-native');
  return { LinearGradient: View };
});

// Video: the player is a plain view and the compressor returns the same file (native modules).
jest.mock('expo-video', () => {
  const { View } = jest.requireActual('react-native');
  return { useVideoPlayer: () => ({}), VideoView: () => <View testID="video-view" /> };
});
jest.mock('react-native-compressor', () => ({
  Video: { compress: async (uri: string) => uri },
  getFileSize: async () => '1000',
}));
