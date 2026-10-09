import { router, useLocalSearchParams } from 'expo-router';
import { ServicesScreen } from '@/features/shop-management';

export default function ServicesRoute() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return (
    <ServicesScreen
      shopId={shopId}
      onNew={() => router.push({ pathname: '/shop/[shopId]/services/new', params: { shopId } })}
      onEdit={(serviceId) =>
        router.push({ pathname: '/shop/[shopId]/services/[serviceId]', params: { shopId, serviceId } })
      }
    />
  );
}
