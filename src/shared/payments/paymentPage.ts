import * as WebBrowser from 'expo-web-browser';
import { requireOptionalNativeModule } from 'expo';
import { Linking } from 'react-native';

/**
 * Opens a payment page that has no "done" URL to watch (memberships): the in-app browser when the
 * build has it, otherwise the system browser. Resolves when the person comes back; the caller
 * then asks the backend for the real state.
 */
export async function openPaymentPage(url: string): Promise<void> {
  if (requireOptionalNativeModule('ExpoWebBrowser')) {
    await WebBrowser.openBrowserAsync(url);
    return;
  }
  await Linking.openURL(url);
}
