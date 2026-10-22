import { useLocalSearchParams } from 'expo-router';
import { PlansScreen, useShopPlan } from '@/features/plans';
import { useShopHome } from '@/features/shop-management';

export default function PlansRoute() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { shop } = useShopHome();
  const plan = useShopPlan(shopId);
  const current = plan.query.data?.plan as { code: string } | null | undefined;
  return (
    <PlansScreen
      shopId={shopId}
      // Independent barbershops (one barber) have their own plans.
      audience={shop.data?.type === 'INDEPENDENT' ? 'BARBER' : 'BARBERSHOP'}
      currentCode={current?.code ?? null}
    />
  );
}
