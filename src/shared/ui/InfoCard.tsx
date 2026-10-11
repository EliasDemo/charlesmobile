import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { sizes, spacing, useTheme, type StatusTone } from '@/shared/theme';
import { Icon, type IconName } from './Icon';
import { TONE_COLORS, useSurfaceStyle } from './surface';
import { Text } from './Text';

export interface InfoItem {
  icon: IconName;
  text: string;
}

export interface InfoCardProps {
  /** Leading visual: a Monogram, an IconTile… */
  leading?: ReactNode;
  /** Main data, the first thing to read. */
  title: string;
  /** One line under the title (address, barbershop…). */
  subtitle?: string;
  /** Secondary data with small icons. Callers pass only values the API returned. */
  details?: InfoItem[];
  /** Status pill, favorite heart… on the top right. */
  trailing?: ReactNode;
  /** Badges row at the bottom. */
  footer?: ReactNode;
  onPress?: () => void;
  testID?: string;
}

/** Card with a clear hierarchy: main data big, secondary data small with icons. */
export function InfoCard({
  leading,
  title,
  subtitle,
  details,
  trailing,
  footer,
  onPress,
  testID,
}: InfoCardProps) {
  const theme = useTheme();
  const content = (
    <>
      {leading}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text variant="subtitle" style={styles.flex} numberOfLines={2}>
            {title}
          </Text>
          {trailing}
        </View>
        {subtitle ? (
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {details && details.length > 0 ? (
          <View style={styles.details}>
            {details.map((item) => (
              <View key={`${item.icon}-${item.text}`} style={styles.detail}>
                <Icon
                  name={item.icon}
                  color={theme.colors.textMuted}
                  size={theme.typography.caption.fontSize}
                />
                <Text variant="caption" color="textSecondary">
                  {item.text}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        {footer}
      </View>
    </>
  );
  const surface = useSurfaceStyle();
  if (!onPress) {
    return (
      <View style={[styles.card, surface]} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.card,
        surface,
        pressed ? { backgroundColor: theme.colors.primarySoft } : null,
      ]}
    >
      {content}
    </Pressable>
  );
}

/** Square tile with a category icon, as the leading visual of a card. */
export function IconTile({ icon, tone }: { icon: IconName; tone?: StatusTone }) {
  const theme = useTheme();
  const [bg, fg] = tone ? TONE_COLORS[tone] : (['primarySoft', 'primary'] as const);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.tile, { backgroundColor: theme.colors[bg], borderRadius: theme.radius.md }]}
    >
      <Icon name={icon} color={theme.colors[fg]} size={sizes.icon} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  body: { flex: 1, gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  flex: { flex: 1 },
  details: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, rowGap: spacing.xxs },
  detail: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  tile: {
    width: sizes.avatarSmall,
    height: sizes.avatarSmall,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
