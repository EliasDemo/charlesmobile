import { requireOptionalNativeModule } from 'expo';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, TurboModuleRegistry, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/shared/i18n';
import { spacing, touchTarget, useTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';
import { outcomeFromDoneUrl, type CheckoutOutcome } from './PaymentProvider';

/** The in-app browser (react-native-webview) arrives with the next build. */
const webViewAvailable = () => TurboModuleRegistry.get('RNCWebViewModule') !== null;
/** Fallback: the system browser session (expo-web-browser), also native. */
const browserAvailable = () => Boolean(requireOptionalNativeModule('ExpoWebBrowser'));

export const checkoutAvailable = () => webViewAvailable() || browserAvailable();

/**
 * The gateway's checkout page, full screen. It closes itself when the page navigates to a URL
 * starting with `doneUrlPrefix` and reports its `status`; closing it by hand reports `closed`
 * (the person may have paid: the booking is read again either way).
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
  const finished = useRef(false);
  const finish = (outcome: CheckoutOutcome) => {
    if (finished.current) return;
    finished.current = true;
    onFinish(outcome);
  };

  // Without the in-app browser, use the system one (same rule: the done URL ends it).
  const useBrowser = !webViewAvailable() && browserAvailable();
  useEffect(() => {
    if (!useBrowser) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const WebBrowser = require('expo-web-browser') as typeof import('expo-web-browser');
    void WebBrowser.openAuthSessionAsync(paymentUrl, doneUrlPrefix).then((result) =>
      finish(result.type === 'success' ? outcomeFromDoneUrl(result.url) : 'closed'),
    );
    // Opened once per checkout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (useBrowser) return null;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { WebView } = require('react-native-webview') as typeof import('react-native-webview');
  return (
    <Modal visible animationType="slide" onRequestClose={() => finish('closed')} statusBarTranslucent>
      <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <View style={[styles.bar, { borderBottomColor: theme.colors.border }]}>
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
        <WebView
          source={{ uri: paymentUrl }}
          startInLoadingState
          renderLoading={() => (
            <View style={[StyleSheet.absoluteFill, styles.loading]}>
              <ActivityIndicator color={theme.colors.primary} size="large" />
            </View>
          )}
          onShouldStartLoadWithRequest={(request) => {
            if (request.url.startsWith(doneUrlPrefix)) {
              finish(outcomeFromDoneUrl(request.url));
              return false;
            }
            return true;
          }}
          style={{ marginBottom: insets.bottom }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.gutter,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  close: { minWidth: touchTarget, minHeight: touchTarget, alignItems: 'center', justifyContent: 'center' },
  loading: { alignItems: 'center', justifyContent: 'center' },
});
