import { router, useLocalSearchParams } from 'expo-router';
import { BarberFormScreen } from '@/features/shop-management';

export default function NewBarberRoute() {
  const { shopId, self } = useLocalSearchParams<{ shopId: string; self?: string }>();
  return (
    <BarberFormScreen
      shopId={shopId}
      self={self === '1'}
      onDone={() => router.back()}
      onSchedule={(barberId) =>
        router.push({ pathname: '/shop/[shopId]/hours', params: { shopId, barberId } })
      }
    />
  );
}
