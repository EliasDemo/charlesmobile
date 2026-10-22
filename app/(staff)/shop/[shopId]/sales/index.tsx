import { router, useLocalSearchParams } from 'expo-router';
import { SalesScreen } from '@/features/business';

export default function SalesRoute() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return (
    <SalesScreen
      shopId={shopId}
      onNew={() => router.push({ pathname: '/shop/[shopId]/sales/new', params: { shopId } })}
      onOpen={(saleId) =>
        router.push({ pathname: '/shop/[shopId]/sales/[saleId]', params: { shopId, saleId } })
      }
    />
  );
}
