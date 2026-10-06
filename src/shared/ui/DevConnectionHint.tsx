import { StyleSheet } from 'react-native';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { spacing } from '@/shared/theme';
import { Card } from './Card';
import { Text } from './Text';

/**
 * Only in development builds. `__DEV__` is false in release bundles, so the minifier drops every
 * branch that depends on it and nothing of this reaches production.
 */
export const showDevConnectionHint = __DEV__ && env.isDevelopment;

/** Shown when the app cannot reach the backend: which URL it uses and what to check. */
export function DevConnectionHint() {
  const { t } = useTranslation('dev');
  if (!showDevConnectionHint) return null;
  return (
    <Card style={styles.card} testID="dev-connection-hint">
      <Text variant="label" color="warning">
        {t('connection.title')}
      </Text>
      <Text variant="caption" selectable>
        {t('connection.url', { url: env.apiUrl })}
      </Text>
      <Text variant="caption" color="textSecondary">
        {t('connection.hint')}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'stretch', gap: spacing.xs },
});
