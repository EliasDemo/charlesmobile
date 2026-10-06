import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { sizes, spacing, touchTarget, useTheme, type Theme } from '@/shared/theme';
import { Text, type TextProps } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  /** Shows a spinner and blocks presses (e.g. while a form is submitting). */
  loading?: boolean;
  fullWidth?: boolean;
}

interface ButtonColors {
  background: string;
  border: string;
  text: NonNullable<TextProps['color']>;
}

function colorsFor({ colors }: Theme, variant: ButtonVariant, pressed: boolean): ButtonColors {
  switch (variant) {
    case 'primary':
      return {
        background: pressed ? colors.primaryPressed : colors.primary,
        border: 'transparent',
        text: 'onPrimary',
      };
    case 'danger':
      return { background: colors.danger, border: 'transparent', text: 'onStatus' };
    case 'secondary':
      return {
        background: pressed ? colors.primarySoft : 'transparent',
        border: colors.primary,
        text: 'primary',
      };
    case 'ghost':
      return {
        background: pressed ? colors.primarySoft : 'transparent',
        border: 'transparent',
        text: 'primary',
      };
  }
}

export function Button({
  label,
  variant = 'primary',
  loading = false,
  fullWidth = false,
  disabled,
  ...props
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = Boolean(disabled) || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => {
        const colors = colorsFor(theme, variant, pressed);
        return [
          styles.base,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            borderRadius: theme.radius.md,
            opacity: isDisabled ? 0.5 : 1,
          },
          fullWidth && styles.fullWidth,
        ];
      }}
      {...props}
    >
      {({ pressed }) => {
        const colors = colorsFor(theme, variant, pressed);
        return (
          <View style={styles.content}>
            {loading ? <ActivityIndicator color={theme.colors[colors.text]} /> : null}
            <Text variant="bodyStrong" color={colors.text}>
              {label}
            </Text>
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: sizes.borderWidth,
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
