import { useTranslation } from '@/shared/i18n';
import { EmptyState } from './StateViews';
import { Screen } from './Screen';

/** Temporary content for routes whose screens arrive in later phases. */
export function PlaceholderScreen({ title }: { title: string }) {
  const { t } = useTranslation();
  return (
    <Screen>
      <EmptyState title={title} message={t('placeholder.comingSoon')} />
    </Screen>
  );
}
