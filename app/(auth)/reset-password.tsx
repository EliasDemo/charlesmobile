import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ResetPasswordScreen } from '@/features/auth';
import { paramString } from '@/shared/lib';

export default function ResetPasswordRoute() {
  const email = paramString(useLocalSearchParams<{ email?: string }>().email);
  if (!email) return <Redirect href="/forgot-password" />;
  return (
    <ResetPasswordScreen
      email={email}
      onDone={() => router.dismissTo({ pathname: '/login', params: { notice: 'passwordChanged' } })}
      onResend={() => router.back()}
    />
  );
}
