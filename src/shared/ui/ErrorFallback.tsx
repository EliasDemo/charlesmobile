import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { spacing, useTheme } from '@/shared/theme';
import { Button } from './Button';
import { Text } from './Text';

export interface ErrorFallbackProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

/**
 * Shown by the error boundary when a screen crashes. Works without providers (theme and i18n
 * have module-level defaults) and never shows the technical error to the user.
 */
export function ErrorFallback({ title, message, onRetry }: ErrorFallbackProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]} accessibilityRole="alert">
      <Text variant="title" align="center">
        {title ?? t('crash.title')}
      </Text>
      <Text color="textSecondary" align="center" selectable>
        {message ?? t('crash.message')}
      </Text>
      {onRetry ? <Button label={t('actions.retry')} onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
});
