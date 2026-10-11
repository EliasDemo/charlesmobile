import { router, useLocalSearchParams } from 'expo-router';
import { TicketScreen } from '@/features/support';

export default function TicketRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TicketScreen ticketId={id} onNew={() => router.push('/support/new')} />;
}
