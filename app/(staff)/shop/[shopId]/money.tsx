import { router, useLocalSearchParams } from 'expo-router';
import { MoneyScreen } from '@/features/business';

export default function MoneyRoute() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return (
    <MoneyScreen
      shopId={shopId}
      onOpenSeller={() => router.push({ pathname: '/shop/[shopId]/seller', params: { shopId } })}
    />
  );
}
