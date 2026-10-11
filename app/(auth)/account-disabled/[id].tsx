import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useRestrictedAccess } from '@/features/auth';
import { TicketScreen } from '@/features/support';

export default function AccountDisabledTicketRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useRestrictedAccess((s) => (s.scope === 'support' ? s.token : null));
  if (!token) return <Redirect href="/login" />;
  return (
    <TicketScreen ticketId={id} accessToken={token} onNew={() => router.push('/account-disabled/new')} />
  );
}
