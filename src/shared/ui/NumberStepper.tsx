import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Icon } from './Icon';
import { Text } from './Text';

export interface NumberStepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step: number;
  min: number;
  max: number;
  /** Text shown for the value (e.g. "30 min"). */
  format: (value: number) => string;
}

/** Minus / value / plus for bounded numbers (service duration), without a native picker. */
export function NumberStepper({ label, value, onChange, step, min, max, format }: NumberStepperProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const change = (delta: number) => onChange(Math.min(max, Math.max(min, value + delta)));
  return (
    <View style={styles.container}>
      <Text variant="label" color="textSecondary">
        {label}
      </Text>
      <View style={[styles.row, { borderColor: theme.colors.border, borderRadius: theme.radius.md }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('stepper.less', { label })}
          disabled={value <= min}
          onPress={() => change(-step)}
          style={styles.button}
        >
          <Icon name="remove" color={value <= min ? theme.colors.textMuted : theme.colors.primary} />
        </Pressable>
        <Text
          variant="subtitle"
          accessibilityLabel={`${label}: ${format(value)}`}
          accessibilityLiveRegion="polite"
        >
          {format(value)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('stepper.more', { label })}
          disabled={value >= max}
          onPress={() => change(step)}
          style={styles.button}
        >
          <Icon name="add" color={value >= max ? theme.colors.textMuted : theme.colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: sizes.borderWidth,
  },
  button: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
});
