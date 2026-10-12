import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, View, type TextInput } from 'react-native';
import EmojiPicker, { en, es } from 'rn-emoji-keyboard';
import { useTranslation } from '@/shared/i18n';
import { haptic } from '@/shared/lib';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Chip } from './Chip';
import { Icon } from './Icon';
import { TextField, type TextFieldProps } from './TextField';

export interface EmojiTextFieldProps extends TextFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  /** Quick reactions shown as chips under the field (they only add text). */
  reactions?: readonly string[];
}

/**
 * Text field with an emoji button (opens a searchable emoji keyboard in the app language) and
 * optional quick reactions. Emojis are plain text: what is sent is just the field value.
 */
export const EmojiTextField = forwardRef<TextInput, EmojiTextFieldProps>(function EmojiTextField(
  { value, onChangeText, reactions, maxLength, ...props },
  ref,
) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const add = (emoji: string) => {
    const next = value.length && !value.endsWith(' ') ? `${value} ${emoji}` : `${value}${emoji}`;
    if (!maxLength || next.length <= maxLength) onChangeText(next);
  };
  return (
    <View style={styles.root}>
      <TextField
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        maxLength={maxLength}
        accessory={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('emoji.open')}
            onPress={() => {
              haptic('light');
              setOpen(true);
            }}
            style={styles.button}
            testID="emoji-button"
          >
            <Icon name="happy-outline" size={sizes.icon} color={theme.colors.textSecondary} />
          </Pressable>
        }
        {...props}
      />
      {reactions?.length ? (
        <View style={styles.reactions}>
          {reactions.map((emoji) => (
            <Chip key={emoji} label={emoji} accessibilityHint={t('emoji.add')} onPress={() => add(emoji)} />
          ))}
        </View>
      ) : null}
      <EmojiPicker
        open={open}
        onClose={() => setOpen(false)}
        onEmojiSelected={(emoji) => add(emoji.emoji)}
        enableSearchBar
        enableRecentlyUsed
        categoryPosition="top"
        translation={i18n.language.startsWith('en') ? en : es}
        theme={{
          backdrop: theme.colors.backdrop,
          knob: theme.colors.border,
          container: theme.colors.surfaceElevated,
          header: theme.colors.textPrimary,
          skinTonesContainer: theme.colors.surface,
          category: {
            icon: theme.colors.textMuted,
            iconActive: theme.colors.primary,
            container: theme.colors.surface,
            containerActive: theme.colors.primarySoft,
          },
          search: {
            background: theme.colors.surface,
            text: theme.colors.textPrimary,
            placeholder: theme.colors.textMuted,
            icon: theme.colors.textMuted,
          },
          emoji: { selected: theme.colors.primarySoft },
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  button: { minWidth: touchTarget, minHeight: touchTarget, alignItems: 'center', justifyContent: 'center' },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
