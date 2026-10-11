import { useLocalSearchParams } from 'expo-router';
import { ShopReviewsScreen } from '@/features/reviews';

export default function ShopReviewsRoute() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return <ShopReviewsScreen shopId={shopId} />;
}
