import * as WebBrowser from 'expo-web-browser';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { requireOptionalNativeModule } from 'expo';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  TurboModuleRegistry,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/shared/i18n';
import { spacing, touchTarget, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';
import { outcomeFromDoneUrl, type CheckoutOutcome } from './PaymentProvider';

/** The in-app browser (react-native-webview). */
const webViewAvailable = () => TurboModuleRegistry.get('RNCWebViewModule') !== null;
/** Fallback: the system browser session (expo-web-browser), also native. */
const browserAvailable = () => Boolean(requireOptionalNativeModule('ExpoWebBrowser'));

export const checkoutAvailable = () => webViewAvailable() || browserAvailable();

const isWeb = (url: string) => /^https?:\/\//i.test(url) || url === 'about:blank';

/**
 * Android `intent://` links (wallet apps, banks) carry the web page to use when the app is not
 * installed in `S.browser_fallback_url`.
 */
export function intentFallbackUrl(url: string): string | null {
  const match = /S\.browser_fallback_url=([^;]+)/.exec(url);
  return match ? decodeURIComponent(match[1]!) : null;
}

/**
 * The gateway's checkout page, full screen. It closes itself when the page navigates to a URL
 * starting with `doneUrlPrefix` and reports its `status`; closing it by hand reports `closed`
 * (the person may have paid: the booking is read again either way). Links that are not web pages
 * (an app of a wallet or bank) are opened outside; Android "back" goes back inside the page first.
 */
export function WebCheckout({
  paymentUrl,
  doneUrlPrefix,
  onFinish,
}: {
  paymentUrl: string;
  doneUrlPrefix: string;
  onFinish: (outcome: CheckoutOutcome) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const webView = useRef<WebView>(null);
  const canGoBack = useRef(false);
  const finished = useRef(false);
  const [failed, setFailed] = useState(false);
  const [url, setUrl] = useState(paymentUrl);

  const finish = (outcome: CheckoutOutcome) => {
    if (finished.current) return;
    finished.current = true;
    onFinish(outcome);
  };

  /** True when the navigation was handled here (done page or a link opened outside). */
  const intercept = (next: string): boolean => {
    if (next.startsWith(doneUrlPrefix)) {
      finish(outcomeFromDoneUrl(next));
      return true;
    }
    if (isWeb(next)) return false;
    const fallback = next.startsWith('intent://') ? intentFallbackUrl(next) : null;
    if (fallback) setUrl(fallback);
    else void Linking.openURL(next).catch(() => undefined);
    return true;
  };

  // Android back: inside the checkout first, then close it.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack.current) {
        webView.current?.goBack();
        return true;
      }
      finish('closed');
      return true;
    });
    return () => subscription.remove();
    // finish is stable for this checkout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Without the in-app browser, use the system one (same rule: the done URL ends it).
  const useBrowser = !webViewAvailable() && browserAvailable();
  const openInBrowser = () => {
    void WebBrowser.openAuthSessionAsync(paymentUrl, doneUrlPrefix).then((result) =>
      finish(result.type === 'success' ? outcomeFromDoneUrl(result.url) : 'closed'),
    );
  };
  useEffect(() => {
    if (useBrowser) openInBrowser();
    // Opened once per checkout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (useBrowser) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={() => finish('closed')} statusBarTranslucent>
      <KeyboardAvoidingView
        behavior="padding"
        style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}
      >
        <View style={[styles.bar, { borderBottomColor: theme.colors.border }]}>
          <Icon name="lock-closed" size={theme.typography.label.fontSize} color={theme.colors.success} />
          <Text variant="bodyStrong" style={styles.flex}>
            {t('payment.title')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('payment.close')}
            onPress={() => finish('closed')}
            style={styles.close}
            testID="checkout-close"
          >
            <Icon name="close" size={touchTarget / 2} color={theme.colors.textPrimary} />
          </Pressable>
        </View>
        {failed ? (
          <View style={styles.failed} testID="checkout-failed">
            <Icon name="cloud-offline" size={touchTarget} color={theme.colors.textMuted} />
            <Text align="center">{t('payment.loadFailed')}</Text>
            <Button
              label={t('actions.retry')}
              icon="refresh"
              onPress={() => {
                setFailed(false);
                webView.current?.reload();
              }}
            />
            {browserAvailable() ? (
              <Button label={t('payment.openBrowser')} variant="ghost" icon="open" onPress={openInBrowser} />
            ) : null}
          </View>
        ) : null}
        <WebView
          ref={webView}
          source={{ uri: url }}
          startInLoadingState
          renderLoading={() => (
            <View style={[StyleSheet.absoluteFill, styles.loading]}>
              <ActivityIndicator color={theme.colors.primary} size="large" />
            </View>
          )}
          // The keyboard pushes the page up (a translucent modal does not resize by itself).
          // Login, 3-D Secure and wallets need cookies, storage and same-window popups.
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          setSupportMultipleWindows={false}
          javaScriptCanOpenWindowsAutomatically
          originWhitelist={['*']}
          onShouldStartLoadWithRequest={(request) => !intercept(request.url)}
          // Some redirects (iOS) only show up here.
          onNavigationStateChange={(state: WebViewNavigation) => {
            canGoBack.current = state.canGoBack;
            if (state.url.startsWith(doneUrlPrefix)) intercept(state.url);
          }}
          onError={() => setFailed(true)}
          onHttpError={(event) => {
            // Only the checkout page itself failing counts (not a resource inside it).
            if (event.nativeEvent.url === url && event.nativeEvent.statusCode >= 500) setFailed(true);
          }}
          style={[styles.flex, failed ? styles.hidden : null, { marginBottom: insets.bottom }]}
          testID="checkout-webview"
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  hidden: { display: 'none' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.gutter,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  close: { minWidth: touchTarget, minHeight: touchTarget, alignItems: 'center', justifyContent: 'center' },
  loading: { alignItems: 'center', justifyContent: 'center' },
  failed: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
});
