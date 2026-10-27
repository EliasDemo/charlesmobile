import { StyleSheet, View } from 'react-native';
import { spacing, useTheme, type StatusTone } from '@/shared/theme';
import { Icon, type IconName } from './Icon';
import { TONE_COLORS } from './surface';
import { Text } from './Text';

export interface StatusPillProps {
  tone: StatusTone;
  /** Required: a state is never shown by color alone. */
  icon: IconName;
  label: string;
}

/** A state with its own color, always with an icon and a text. */
export function StatusPill({ tone, icon, label }: StatusPillProps) {
  const theme = useTheme();
  const [bg, fg] = TONE_COLORS[tone];
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[styles.pill, { backgroundColor: theme.colors[bg], borderRadius: theme.radius.pill }]}
      testID={`status-${tone}`}
    >
      <Icon name={icon} color={theme.colors[fg]} size={theme.typography.caption.fontSize} />
      <Text variant="label" numberOfLines={1} style={[styles.label, { color: theme.colors[fg] }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  label: { flexShrink: 1 },
});
