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
