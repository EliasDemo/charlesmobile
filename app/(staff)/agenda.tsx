import { useTranslation } from '@/shared/i18n';
import { PlaceholderScreen } from '@/shared/ui';

export default function AgendaRoute() {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('nav.agenda')} />;
}
