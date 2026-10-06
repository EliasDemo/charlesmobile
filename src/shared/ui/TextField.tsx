import { forwardRef, useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Text } from './Text';

export interface TextFieldProps extends TextInputProps {
  label: string;
  hint?: string;
  /** Shown under the field and announced to screen readers. */
  error?: string;
  /** Control inside the field, on the right (e.g. show password). */
  accessory?: ReactNode;
  /** Extra content under the field (e.g. live password requirements). */
  footer?: ReactNode;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, hint, error, accessory, footer, onFocus, onBlur, editable = true, style, ...props },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? theme.colors.danger : focused ? theme.colors.focus : theme.colors.border;
  return (
    <View style={styles.container}>
      <Text variant="label" color="textSecondary">
        {label}
      </Text>
      <View
        style={[
          styles.box,
          {
            backgroundColor: editable ? theme.colors.surface : theme.colors.disabledBackground,
            borderColor,
            borderRadius: theme.radius.md,
          },
        ]}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          accessibilityState={{ disabled: !editable }}
          editable={editable}
          placeholderTextColor={theme.colors.textMuted}
          selectionColor={theme.colors.primary}
          maxFontSizeMultiplier={2}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            theme.typography.body,
            styles.input,
            { color: editable ? theme.colors.textPrimary : theme.colors.onDisabled },
            style,
          ]}
          {...props}
        />
        {accessory}
      </View>
      {error ? (
        <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="textMuted">
          {hint}
        </Text>
      ) : null}
      {footer}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTarget,
    borderWidth: sizes.borderWidth,
  },
  input: { flex: 1, minHeight: touchTarget, paddingHorizontal: spacing.md },
});
