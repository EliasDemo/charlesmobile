import { router, useLocalSearchParams } from 'expo-router';
import { RegisterScreen } from '@/features/auth';
import { safeReturnTo } from '@/shared/lib';

export default function RegisterRoute() {
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const returnTo = safeReturnTo(params.returnTo);
  const toLogin = (notice?: 'registered') =>
    router.replace({ pathname: '/login', params: { returnTo, ...(notice ? { notice } : {}) } });
  return <RegisterScreen onSuccess={() => toLogin('registered')} onLogin={() => toLogin()} />;
}
