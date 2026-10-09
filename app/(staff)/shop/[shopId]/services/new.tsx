import { router, useLocalSearchParams } from 'expo-router';
import { ServiceFormScreen } from '@/features/shop-management';

export default function NewServiceRoute() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return <ServiceFormScreen shopId={shopId} onDone={() => router.back()} />;
}
