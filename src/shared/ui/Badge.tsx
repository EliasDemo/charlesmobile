import { StyleSheet, View } from 'react-native';
import { spacing, useTheme } from '@/shared/theme';
import { Text } from './Text';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

const TEXT_COLOR = {
  neutral: 'textSecondary',
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
} as const;

/** Small status label ("Abierta ahora", "Independiente"). Text on the plain surface for contrast. */
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const theme = useTheme();
  const color = tone === 'neutral' ? theme.colors.border : theme.colors[TEXT_COLOR[tone]];
  return (
    <View style={[styles.badge, { borderColor: color, borderRadius: theme.radius.pill }]}>
      <Text variant="caption" color={TEXT_COLOR[tone]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    alignSelf: 'flex-start',
  },
});
