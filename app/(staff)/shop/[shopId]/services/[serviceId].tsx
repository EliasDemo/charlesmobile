import { router, useLocalSearchParams } from 'expo-router';
import { ServiceFormScreen } from '@/features/shop-management';

export default function EditServiceRoute() {
  const { shopId, serviceId } = useLocalSearchParams<{ shopId: string; serviceId: string }>();
  return <ServiceFormScreen shopId={shopId} serviceId={serviceId} onDone={() => router.back()} />;
}
