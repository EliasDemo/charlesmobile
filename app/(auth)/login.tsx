import { router, useLocalSearchParams } from 'expo-router';
import { LoginScreen } from '@/features/auth';
import { paramString, safeReturnTo } from '@/shared/lib';

const NOTICES = ['registered', 'passwordChanged', 'deletionCancelled'] as const;
type Notice = (typeof NOTICES)[number];

export default function LoginRoute() {
  const params = useLocalSearchParams<{ returnTo?: string; notice?: string }>();
  const returnTo = safeReturnTo(params.returnTo);
  const notice = paramString(params.notice);
  return (
    <LoginScreen
      notice={NOTICES.includes(notice as Notice) ? (notice as Notice) : undefined}
      onSuccess={(user, email) => {
        // Unverified accounts are offered the verification first (needed to book).
        if (!user.emailVerified) {
          router.replace({ pathname: '/verify-email', params: { returnTo, email } });
          return;
        }
        router.dismissTo(returnTo as never);
      }}
      onPendingDeletion={() => router.push('/account-pending')}
      onDisabled={() => router.push('/account-disabled')}
      onForgotPassword={() => router.push('/forgot-password')}
      onRegister={() => router.push({ pathname: '/register', params: { returnTo } })}
    />
  );
}
