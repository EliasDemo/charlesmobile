import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { Icon } from './Icon';
import { useKeyboardVisible } from './keyboard';
import { Text } from './Text';

/**
 * The brand on top of login and register: a navy panel with a curved bottom, the emblem in a
 * copper ring, the name in the serif and the tagline. While typing it shrinks to one line, so
 * the fields keep the room.
 */
export function BrandHeader() {
  const { t } = useTranslation();
  const theme = useTheme();
  const compact = useKeyboardVisible();
  const emblem = compact ? sizes.avatarSmall : sizes.avatarLarge;
  return (
    <View
      accessibilityRole="header"
      accessibilityLabel={t('appName')}
      style={[
        compact ? styles.compact : styles.full,
        {
          backgroundColor: theme.colors.brand,
          borderRadius: theme.radius.xl,
          borderBottomLeftRadius: compact ? theme.radius.xl : CURVE,
          borderBottomRightRadius: compact ? theme.radius.xl : CURVE,
        },
      ]}
    >
      <View
        style={[
          styles.emblem,
          {
            width: emblem,
            height: emblem,
            borderRadius: emblem / 2,
            borderColor: theme.colors.brandAccent,
            backgroundColor: theme.colors.brand,
          },
        ]}
      >
        <Icon name="cut" size={emblem * EMBLEM_ICON} color={theme.colors.onBrand} />
      </View>
      <View style={compact ? styles.flex : styles.center}>
        <Text variant={compact ? 'subtitle' : 'display'} color="onBrand" align={compact ? 'left' : 'center'}>
          {t('appName')}
        </Text>
        {compact ? null : (
          <>
            <View style={styles.rule}>
              <View style={[styles.line, { backgroundColor: theme.colors.brandAccent }]} />
              <Text variant="caption" color="brandAccent">
                {t('brand.tagline')}
              </Text>
              <View style={[styles.line, { backgroundColor: theme.colors.brandAccent }]} />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const CURVE = sizes.avatarLarge;
const EMBLEM_ICON = 0.45;

const styles = StyleSheet.create({
  full: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  compact: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  emblem: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  center: { alignItems: 'center', gap: spacing.xs },
  flex: { flex: 1 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  line: { width: spacing.xl, height: 1 },
});
