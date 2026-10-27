import { router, useLocalSearchParams } from 'expo-router';
import { ReportsScreen } from '@/features/business';

export default function Route() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return (
    <ReportsScreen
      shopId={shopId}
      onUpgrade={() => router.push({ pathname: '/shop/[shopId]/plans', params: { shopId } })}
    />
  );
}
