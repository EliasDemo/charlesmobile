import { Redirect, router } from 'expo-router';
import { useRestrictedAccess } from '@/features/auth';
import { NewTicketScreen } from '@/features/support';

export default function AccountDisabledNewRoute() {
  const token = useRestrictedAccess((s) => (s.scope === 'support' ? s.token : null));
  if (!token) return <Redirect href="/login" />;
  return (
    <NewTicketScreen
      accessToken={token}
      onCreated={(id) => router.replace({ pathname: '/account-disabled/[id]', params: { id } })}
    />
  );
}
