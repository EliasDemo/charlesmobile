import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Text } from './Text';

export interface TextFieldProps extends TextInputProps {
  label: string;
  hint?: string;
  /** Shown under the field and announced to screen readers. */
  error?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, hint, error, onFocus, onBlur, editable = true, style, ...props },
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
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
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
          {
            color: theme.colors.textPrimary,
            backgroundColor: theme.colors.surface,
            borderColor,
            borderRadius: theme.radius.md,
            opacity: editable ? 1 : 0.6,
          },
          style,
        ]}
        {...props}
      />
      {error ? (
        <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="textMuted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  input: { minHeight: touchTarget, paddingHorizontal: spacing.md, borderWidth: sizes.borderWidth },
});
