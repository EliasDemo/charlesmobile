import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Icon } from './Icon';
import { useKeyboardVisible } from './keyboard';

export interface MessageBarProps {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  canSend: boolean;
  sending: boolean;
  placeholder: string;
  /** Screen reader label of the field and of the send button. */
  label: string;
  sendLabel: string;
  maxLength: number;
  disabled?: boolean;
  testID?: string;
}

/**
 * The writing bar of a chat or a comment thread: grows with the text and has a round send button.
 * Goes at the bottom of a `KeyboardAvoider`; keeps clear of the gesture bar while the keyboard is hidden.
 */
export function MessageBar({
  value,
  onChange,
  onSend,
  canSend,
  sending,
  placeholder,
  label,
  sendLabel,
  maxLength,
  disabled = false,
  testID,
}: MessageBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardVisible();
  return (
    <View
      style={[
        styles.bar,
        {
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.background,
          paddingBottom: spacing.sm + (keyboard ? 0 : insets.bottom),
        },
      ]}
    >
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        multiline
        maxLength={maxLength}
        editable={!disabled}
        accessibilityLabel={label}
        maxFontSizeMultiplier={2}
        style={[
          theme.typography.body,
          styles.input,
          {
            color: theme.colors.textPrimary,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.xl,
          },
        ]}
        testID={testID}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={sendLabel}
        accessibilityState={{ disabled: !canSend || sending }}
        disabled={!canSend || sending}
        onPress={onSend}
        style={[
          styles.send,
          {
            backgroundColor: canSend ? theme.colors.primary : theme.colors.border,
            borderRadius: touchTarget / 2,
          },
        ]}
      >
        {sending ? (
          <ActivityIndicator color={theme.colors.onPrimary} />
        ) : (
          <Icon name="send" size={sizes.icon} color={theme.colors.onPrimary} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: touchTarget,
    maxHeight: touchTarget * 3,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderWidth: sizes.borderWidth,
  },
  send: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
});
