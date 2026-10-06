import { router } from 'expo-router';
import { SignInPrompt } from '@/features/auth';
import { useSession } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { PlaceholderScreen } from '@/shared/ui';

// My bookings arrive in M4.
export default function BookingsRoute() {
  const { t } = useTranslation();
  const status = useSession((s) => s.status);
  if (status !== 'authenticated') {
    return (
      <SignInPrompt
        onLogin={() => router.push({ pathname: '/login', params: { returnTo: '/bookings' } })}
        onRegister={() => router.push('/register')}
      />
    );
  }
  return <PlaceholderScreen title={t('nav.bookings')} />;
}
