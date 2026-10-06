import { StyleSheet, View, type ViewProps } from 'react-native';
import { sizes, spacing, useTheme } from '@/shared/theme';

export function Card({ style, ...props }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, gap: spacing.sm, borderWidth: sizes.borderWidth },
});
