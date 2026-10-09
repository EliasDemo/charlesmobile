import { router, useLocalSearchParams } from 'expo-router';
import { ShopStatusScreen } from '@/features/shop-management';

export default function ShopStatusRoute() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return <ShopStatusScreen shopId={shopId} onSaved={() => router.back()} />;
}
