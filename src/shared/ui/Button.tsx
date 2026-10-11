import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { sizes, spacing, touchTarget, useTheme, type Theme } from '@/shared/theme';
import { Icon, type IconName } from './Icon';
import { Text, type TextProps } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  /** Shows a spinner and blocks presses (e.g. while a form is submitting). Keeps full contrast. */
  loading?: boolean;
  fullWidth?: boolean;
  /** Leading icon (decorative: the label already says what it does). */
  icon?: IconName;
}

type ButtonState = 'normal' | 'pressed' | 'disabled';

export interface ButtonColors {
  background: string;
  border: string;
  text: NonNullable<TextProps['color']> | 'onDisabled';
}

/**
 * Colors per variant and state, all from theme tokens (contrast is tested in shared/theme).
 * Loading uses the normal colors: the label and spinner must stay readable while submitting.
 */
export function buttonColors({ colors }: Theme, variant: ButtonVariant, state: ButtonState): ButtonColors {
  if (state === 'disabled') {
    return {
      background: variant === 'ghost' ? 'transparent' : colors.disabledBackground,
      border: variant === 'secondary' ? colors.onDisabled : 'transparent',
      text: 'onDisabled',
    };
  }
  const pressed = state === 'pressed';
  switch (variant) {
    case 'primary':
      return {
        background: pressed ? colors.primaryPressed : colors.primary,
        border: 'transparent',
        text: 'onPrimary',
      };
    case 'danger':
      return {
        background: pressed ? colors.dangerPressed : colors.danger,
        border: 'transparent',
        text: 'onStatus',
      };
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
  icon,
  disabled,
  ...props
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = Boolean(disabled) && !loading;
  const stateFor = (pressed: boolean): ButtonState =>
    isDisabled ? 'disabled' : pressed && !loading ? 'pressed' : 'normal';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled || loading, busy: loading }}
      disabled={isDisabled || loading}
      style={({ pressed }) => {
        const colors = buttonColors(theme, variant, stateFor(pressed));
        return [
          styles.base,
          { backgroundColor: colors.background, borderColor: colors.border, borderRadius: theme.radius.pill },
          fullWidth && styles.fullWidth,
        ];
      }}
      {...props}
    >
      {({ pressed }) => {
        const colors = buttonColors(theme, variant, stateFor(pressed));
        const textColor = theme.colors[colors.text];
        return (
          <View style={styles.content}>
            {loading ? (
              <ActivityIndicator color={textColor} testID="button-spinner" />
            ) : icon ? (
              <Icon name={icon} size={sizes.icon} color={textColor} />
            ) : null}
            <Text variant="bodyStrong" style={{ color: textColor }}>
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: sizes.borderWidth,
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
