import { useLocalSearchParams } from 'expo-router';
import { ScheduleScreen } from '@/features/shop-management';

/** The barbershop's hours, or a barber's (barberId). A barber sees their own read-only (own=1). */
export default function HoursRoute() {
  const { shopId, barberId, own } = useLocalSearchParams<{
    shopId: string;
    barberId?: string;
    own?: string;
  }>();
  return <ScheduleScreen shopId={shopId} barberId={barberId} readOnly={own === '1'} />;
}
