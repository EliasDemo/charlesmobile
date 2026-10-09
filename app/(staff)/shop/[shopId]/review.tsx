import { router, useLocalSearchParams } from 'expo-router';
import { ShopReviewScreen } from '@/features/shop-management';

export default function ShopReviewRoute() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return (
    <ShopReviewScreen
      shopId={shopId}
      onEditDetails={() => router.push({ pathname: '/shop/[shopId]/details', params: { shopId } })}
    />
  );
}
