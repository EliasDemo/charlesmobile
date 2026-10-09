import { StyleSheet, View } from 'react-native';
import { spacing, useTheme, type StatusTone } from '@/shared/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

const TONE_COLORS = {
  pending: ['statusPendingBg', 'statusPendingFg'],
  success: ['statusSuccessBg', 'statusSuccessFg'],
  neutral: ['statusNeutralBg', 'statusNeutralFg'],
  danger: ['statusDangerBg', 'statusDangerFg'],
} as const;

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
      <Text variant="label" style={{ color: theme.colors[fg] }}>
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
  },
});
