import { router, useLocalSearchParams } from 'expo-router';
import { BarbersScreen } from '@/features/shop-management';

export default function BarbersRoute() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return (
    <BarbersScreen
      shopId={shopId}
      onNew={() => router.push({ pathname: '/shop/[shopId]/barbers/new', params: { shopId } })}
      onRegisterMe={() =>
        router.push({ pathname: '/shop/[shopId]/barbers/new', params: { shopId, self: '1' } })
      }
      onEdit={(barberId) =>
        router.push({ pathname: '/shop/[shopId]/barbers/[barberId]', params: { shopId, barberId } })
      }
    />
  );
}
