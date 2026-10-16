import { useLocalSearchParams } from 'expo-router';
import { PromotionScreen } from '@/features/promotions';

export default function PromotionRoute() {
  const { shopId, promotionId } = useLocalSearchParams<{ shopId: string; promotionId: string }>();
  return <PromotionScreen shopId={shopId} promotionId={promotionId} />;
}
