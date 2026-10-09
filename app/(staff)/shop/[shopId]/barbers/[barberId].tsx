import { router, useLocalSearchParams } from 'expo-router';
import { BarberFormScreen } from '@/features/shop-management';

export default function EditBarberRoute() {
  const { shopId, barberId } = useLocalSearchParams<{ shopId: string; barberId: string }>();
  return (
    <BarberFormScreen
      shopId={shopId}
      barberId={barberId}
      onDone={() => router.back()}
      onSchedule={(id) => router.push({ pathname: '/shop/[shopId]/hours', params: { shopId, barberId: id } })}
    />
  );
}
