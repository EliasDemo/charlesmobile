import { router, useLocalSearchParams } from 'expo-router';
import { PromotionsScreen } from '@/features/promotions';

export default function PromotionsRoute() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return (
    <PromotionsScreen
      shopId={shopId}
      onNew={() => router.push({ pathname: '/shop/[shopId]/promotions/new', params: { shopId } })}
      onOpen={(promotionId) =>
        router.push({ pathname: '/shop/[shopId]/promotions/[promotionId]', params: { shopId, promotionId } })
      }
    />
  );
}
