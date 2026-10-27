import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';

/** The store icon, next to the notification bell (works with or without a session). */
export function StoreButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation('ads');
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('store.open')}
      hitSlop={spacing.sm}
      style={styles.button}
      testID="store-button"
    >
      <Icon name="bag-handle-outline" size={sizes.icon} color={theme.colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minWidth: touchTarget, minHeight: touchTarget, alignItems: 'center', justifyContent: 'center' },
});
