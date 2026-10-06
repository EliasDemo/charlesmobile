import * as SecureStore from 'expo-secure-store';

// Only the refresh token is persisted, and only in the Keychain / Keystore.
// The access token lives in memory (see session.ts).
const REFRESH_TOKEN_KEY = 'charles.refreshToken';

export const tokenStorage = {
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string) =>
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    }),
  clear: () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
};
