import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Icon } from './Icon';
import { Text } from './Text';

const MINUTES_PER_DAY = 24 * 60;

/** "HH:MM" ⇄ minutes since midnight. */
export const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number) as [number, number];
  return h * 60 + m;
};
export const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export interface TimeStepperProps {
  label: string;
  /** "HH:MM" local time of the barbershop. */
  value: string;
  onChange: (value: string) => void;
  /** Step in minutes: the API accepts multiples of 5. */
  step?: number;
  /** Bounds in "HH:MM" (inclusive). */
  min?: string;
  max?: string;
}

/**
 * Time picker without a native module: minus / value / plus, in steps of 5 minutes (long press
 * would need extra native work). Each button is a 44 pt target with its own accessible label.
 */
export function TimeStepper({
  label,
  value,
  onChange,
  step = 5,
  min = '00:00',
  max = '23:55',
}: TimeStepperProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const current = toMinutes(value);
  const lower = toMinutes(min);
  const upper = Math.min(toMinutes(max), MINUTES_PER_DAY - step);
  const change = (delta: number) => onChange(toTime(Math.min(upper, Math.max(lower, current + delta))));
  return (
    <View style={styles.container}>
      <Text variant="label" color="textSecondary">
        {label}
      </Text>
      <View
        style={[styles.row, { borderColor: theme.colors.border, borderRadius: theme.radius.md }]}
        accessible={false}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('time.earlier', { label, step })}
          disabled={current <= lower}
          onPress={() => change(-step)}
          style={styles.button}
        >
          <Icon name="remove" color={current <= lower ? theme.colors.textMuted : theme.colors.primary} />
        </Pressable>
        <Text variant="subtitle" accessibilityLabel={`${label}: ${value}`} accessibilityLiveRegion="polite">
          {value}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('time.later', { label, step })}
          disabled={current >= upper}
          onPress={() => change(step)}
          style={styles.button}
        >
          <Icon name="add" color={current >= upper ? theme.colors.textMuted : theme.colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs, flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: sizes.borderWidth,
  },
  button: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
});
