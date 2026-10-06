import { router } from 'expo-router';
import { useTranslation } from '@/shared/i18n';
import { EmptyState, Screen } from '@/shared/ui';

export default function NotFoundRoute() {
  const { t } = useTranslation();
  return (
    <Screen>
      <EmptyState
        title={t('notFound.title')}
        action={{ label: t('actions.goHome'), onPress: () => router.replace('/') }}
      />
    </Screen>
  );
}
