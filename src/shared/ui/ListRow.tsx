import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Text } from './Text';

export interface ListRowProps {
  title: string;
  /** Secondary text under the title. */
  subtitle?: string;
  /** Value shown on the right (e.g. the current phone). */
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}

/** A row in a settings-like list. Pressable rows show a chevron. */
export function ListRow({ title, subtitle, value, onPress, destructive }: ListRowProps) {
  const theme = useTheme();
  const content = (
    <>
      <View style={styles.texts}>
        <Text color={destructive ? 'danger' : 'textPrimary'}>{title}</Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? <Text color="textSecondary">{value}</Text> : null}
      {onPress ? (
        <Text color="textMuted" importantForAccessibility="no">
          ›
        </Text>
      ) : null}
    </>
  );
  if (!onPress) {
    return (
      <View style={[styles.row, { borderColor: theme.colors.border }]} accessible>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: theme.colors.border,
          backgroundColor: pressed ? theme.colors.primarySoft : 'transparent',
        },
      ]}
    >
      {content}
    </Pressable>
  );
}

export interface SwitchRowProps {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function SwitchRow({ title, subtitle, value, onValueChange, disabled }: SwitchRowProps) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { borderColor: theme.colors.border }]}>
      <View style={styles.texts}>
        <Text>{title}</Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={title}
        accessibilityHint={subtitle}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor={theme.colors.surfaceElevated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touchTarget,
    paddingVertical: spacing.sm,
    borderBottomWidth: sizes.borderWidth,
  },
  texts: { flex: 1, gap: spacing.xxs },
});
