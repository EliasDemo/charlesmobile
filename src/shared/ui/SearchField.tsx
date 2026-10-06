import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Icon } from './Icon';

export interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /** Accessible name of the field. */
  label: string;
}

export function SearchField({ value, onChangeText, placeholder, label }: SearchFieldProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View
      style={[
        styles.box,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.pill,
        },
      ]}
    >
      <Icon name="search" color={theme.colors.textMuted} />
      <TextInput
        accessibilityLabel={label}
        accessibilityRole="search"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        selectionColor={theme.colors.primary}
        returnKeyType="search"
        autoCorrect={false}
        maxFontSizeMultiplier={2}
        style={[theme.typography.body, styles.input, { color: theme.colors.textPrimary }]}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('search.clear')}
          onPress={() => onChangeText('')}
          style={styles.clear}
        >
          <Icon name="close-circle" color={theme.colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTarget,
    paddingLeft: spacing.md,
    borderWidth: sizes.borderWidth,
    gap: spacing.sm,
  },
  input: { flex: 1, minHeight: touchTarget },
  clear: { minWidth: touchTarget, minHeight: touchTarget, alignItems: 'center', justifyContent: 'center' },
});
