import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { VerifyEmailScreen } from '@/features/auth';
import { useSession } from '@/shared/api';
import { paramString, safeReturnTo } from '@/shared/lib';

/** Needs a session: the verification endpoints are authenticated. */
export default function VerifyEmailRoute() {
  const params = useLocalSearchParams<{ email?: string; returnTo?: string }>();
  const status = useSession((s) => s.status);
  const returnTo = safeReturnTo(params.returnTo);
  if (status !== 'authenticated') {
    return <Redirect href={{ pathname: '/login', params: { returnTo: '/verify-email' } }} />;
  }
  const leave = () => router.dismissTo(returnTo as never);
  return <VerifyEmailScreen email={paramString(params.email)} onVerified={leave} onLater={leave} />;
}
