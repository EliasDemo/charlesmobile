import { router, useLocalSearchParams } from 'expo-router';
import { EditShopScreen } from '@/features/shop-management';

export default function ShopDetailsRoute() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return <EditShopScreen shopId={shopId} onDone={() => router.back()} />;
}
