import { router, useLocalSearchParams } from 'expo-router';
import { LoginScreen } from '@/features/auth';
import { paramString, safeReturnTo } from '@/shared/lib';

const NOTICES = ['registered', 'passwordChanged'] as const;
type Notice = (typeof NOTICES)[number];

export default function LoginRoute() {
  const params = useLocalSearchParams<{ returnTo?: string; notice?: string }>();
  const returnTo = safeReturnTo(params.returnTo);
  const notice = paramString(params.notice);
  return (
    <LoginScreen
      notice={NOTICES.includes(notice as Notice) ? (notice as Notice) : undefined}
      onSuccess={(user) => {
        // Unverified accounts are offered the verification first (needed to book).
        if (!user.emailVerified) {
          router.replace({ pathname: '/verify-email', params: { returnTo } });
          return;
        }
        router.dismissTo(returnTo as never);
      }}
      onForgotPassword={() => router.push('/forgot-password')}
      onRegister={() => router.push({ pathname: '/register', params: { returnTo } })}
    />
  );
}
