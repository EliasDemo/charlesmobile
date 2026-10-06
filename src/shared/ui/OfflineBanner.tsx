import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsOnline } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { spacing, touchTarget, useTheme } from '@/shared/theme';
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
      style={[styles.banner, { backgroundColor: theme.colors.warning, paddingTop: insets.top + spacing.xs }]}
    >
      <Text variant="label" color="onStatus" align="center">
        {t('offline.banner')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: touchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
});
