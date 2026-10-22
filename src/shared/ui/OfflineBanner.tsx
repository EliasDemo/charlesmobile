import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsOnline } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Icon } from './Icon';
import { Text } from './Text';

/** Visible notice while offline; tapping re-checks connectivity. */
export function OfflineBanner() {
  const online = useIsOnline();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  if (online) return null;
  const recheck = () => {
    void NetInfo.refresh().then((state) => onlineManager.setOnline(state.isConnected !== false));
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('offline.banner')}
      accessibilityHint={t('offline.retry')}
      accessibilityLiveRegion="polite"
      onPress={recheck}
      style={[styles.banner, { backgroundColor: theme.colors.brand, paddingTop: insets.top + spacing.xs }]}
    >
      <Icon name="cloud-offline" size={sizes.icon} color={theme.colors.brandAccent} />
      <Text variant="label" color="onBrand" align="center" style={styles.flex}>
        {t('offline.banner')}
      </Text>
      <Text variant="label" color="brandAccent">
        {t('offline.retryShort')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flexShrink: 1 },
  banner: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
});
