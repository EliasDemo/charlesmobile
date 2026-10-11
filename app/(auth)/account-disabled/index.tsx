import { Redirect, router } from 'expo-router';
import { useRestrictedAccess } from '@/features/auth';
import { DisabledAccountHeader, SupportScreen } from '@/features/support';

export default function AccountDisabledRoute() {
  const token = useRestrictedAccess((s) => (s.scope === 'support' ? s.token : null));
  if (!token) return <Redirect href="/login" />;
  return (
    <SupportScreen
      accessToken={token}
      header={
        <DisabledAccountHeader
          onLeave={() => {
            useRestrictedAccess.getState().clear();
            router.replace('/login');
          }}
        />
      }
      onNew={() => router.push('/account-disabled/new')}
      onOpen={(id) => router.push({ pathname: '/account-disabled/[id]', params: { id } })}
    />
  );
}
