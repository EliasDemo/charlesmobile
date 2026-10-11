import { router, useLocalSearchParams } from 'expo-router';
import { NewTicketScreen } from '@/features/support';

export default function NewTicketRoute() {
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  return (
    <NewTicketScreen
      bookingId={bookingId}
      onCreated={(id) => router.replace({ pathname: '/support/[id]', params: { id } })}
    />
  );
}
