import { StyleSheet, View } from 'react-native';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/** A section title with its icon in a soft copper tile, and an optional line under it. */
export function SectionHeading({ title, hint, icon }: { title: string; hint?: string; icon: IconName }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View
        style={[styles.tile, { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.md }]}
      >
        <Icon name={icon} size={sizes.icon - spacing.xs} color={theme.colors.primary} />
      </View>
      <View style={styles.flex}>
        <Text variant="subtitle" numberOfLines={1}>
          {title}
        </Text>
        {hint ? (
          <Text variant="caption" color="textSecondary" numberOfLines={2}>
            {hint}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tile: {
    width: sizes.avatarSmall,
    height: sizes.avatarSmall,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
});
