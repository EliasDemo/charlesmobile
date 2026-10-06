import { useTranslation } from '@/shared/i18n';
import { Button, Card, QueryView, Screen, Text } from '@/shared/ui';
import { useServerStatus } from '../hooks/useServerStatus';

export interface HomeScreenProps {
  apiUrl: string;
  /** Only provided in development builds. */
  onOpenDesignSystem?: () => void;
}

/** Temporary home for M1: shows that the app reaches the backend. Replaced by Explore in M3. */
export function HomeScreen({ apiUrl, onOpenDesignSystem }: HomeScreenProps) {
  const { t } = useTranslation();
  const { query, isHealthy, checks } = useServerStatus();
  return (
    <Screen>
      <Text variant="display">{t('home.title')}</Text>
      <Text color="textSecondary">{t('home.subtitle')}</Text>
      <Card>
        <Text variant="subtitle">{t('home.serverTitle')}</Text>
        <QueryView query={query}>
          {() => (
            <>
              <Text color={isHealthy ? 'success' : 'warning'} testID="server-status">
                {isHealthy ? t('home.serverOk') : t('home.serverDegraded')}
              </Text>
              {checks ? (
                <Text variant="caption" color="textSecondary">
                  {t('home.serverChecks', {
                    database: t(`home.component.${checks.database}`),
                    cache: t(`home.component.${checks.redis}`),
                  })}
                </Text>
              ) : null}
            </>
          )}
        </QueryView>
        <Text variant="caption" color="textMuted" selectable>
          {t('home.apiUrl', { url: apiUrl })}
        </Text>
      </Card>
      {onOpenDesignSystem ? (
        <Button label={t('home.designSystem')} variant="secondary" onPress={onOpenDesignSystem} />
      ) : null}
    </Screen>
  );
}
