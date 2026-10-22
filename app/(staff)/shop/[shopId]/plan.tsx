import { router, useLocalSearchParams } from 'expo-router';
import { MyPlanScreen } from '@/features/plans';
import { useShopHome } from '@/features/shop-management';

export default function MyPlanRoute() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { shop } = useShopHome();
  return (
    <MyPlanScreen
      shopId={shopId}
      isOwner={shop.data?.myRole === 'OWNER'}
      onChangePlan={() => router.push({ pathname: '/shop/[shopId]/plans', params: { shopId } })}
    />
  );
}
