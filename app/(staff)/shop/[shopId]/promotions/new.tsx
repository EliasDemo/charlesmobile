import { router, useLocalSearchParams } from 'expo-router';
import { NewPromotionScreen } from '@/features/promotions';

export default function NewPromotionRoute() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return (
    <NewPromotionScreen
      shopId={shopId}
      onCreated={(promotionId) =>
        router.replace({
          pathname: '/shop/[shopId]/promotions/[promotionId]',
          params: { shopId, promotionId },
        })
      }
    />
  );
}
