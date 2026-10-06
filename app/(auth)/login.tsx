import { useTranslation } from '@/shared/i18n';
import { PlaceholderScreen } from '@/shared/ui';

// Real login arrives in M2. Receives `returnTo` to go back to the protected screen afterwards.
export default function LoginRoute() {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('nav.login')} />;
}
