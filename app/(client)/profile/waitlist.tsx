import { router } from 'expo-router';
import { MyWaitlistScreen } from '@/features/waitlist';

export default function WaitlistRoute() {
  return (
    <MyWaitlistScreen
      onBook={(barbershopId, serviceId) =>
        router.push({ pathname: '/book/[barbershopId]', params: { barbershopId, serviceId } })
      }
    />
  );
}
