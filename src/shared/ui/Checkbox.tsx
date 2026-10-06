import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Text } from './Text';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Plain label used by screen readers. */
  label: string;
  /** Optional rich content shown instead of the plain label (e.g. text with a link). */
  children?: ReactNode;
  error?: string;
  disabled?: boolean;
}

export function Checkbox({ checked, onChange, label, children, error, disabled }: CheckboxProps) {
  const theme = useTheme();
  const borderColor = error ? theme.colors.danger : checked ? theme.colors.primary : theme.colors.textMuted;
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityHint={error}
        accessibilityState={{ checked, disabled }}
        disabled={disabled}
        onPress={() => onChange(!checked)}
        style={styles.row}
      >
        <View
          style={[
            styles.box,
            {
              borderColor,
              backgroundColor: checked ? theme.colors.primary : 'transparent',
              borderRadius: theme.radius.sm,
            },
          ]}
        >
          {checked ? (
            <Text variant="label" color="onPrimary" importantForAccessibility="no">
              ✓
            </Text>
          ) : null}
        </View>
        <View style={styles.label}>{children ?? <Text>{label}</Text>}</View>
      </Pressable>
      {error ? (
        <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const BOX_SIZE = 24;

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: touchTarget },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderWidth: sizes.borderWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1 },
});
