import { router } from 'expo-router';
import { SummaryScreen } from '@/features/booking';
import { askForAccount } from '@/shared/ui';

// Public: the account is asked for only when confirming, and login comes back here.
export default function SummaryRoute() {
  return (
    <SummaryScreen
      onCreated={(id) => router.replace({ pathname: '/bookings/[id]', params: { id } })}
      onRequireLogin={() => askForAccount('book', '/book/summary')}
      onRequireVerification={() =>
        router.push({ pathname: '/verify-email', params: { returnTo: '/book/summary' } })
      }
      onSlotTaken={() => router.back()}
      onChangeSlot={() => router.back()}
      onSeeBookings={() => router.replace('/bookings')}
    />
  );
}
