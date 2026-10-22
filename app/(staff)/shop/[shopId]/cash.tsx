import { router, useLocalSearchParams } from 'expo-router';
import { CashScreen } from '@/features/business';

export default function CashRoute() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return (
    <CashScreen
      shopId={shopId}
      onNewSale={() => router.push({ pathname: '/shop/[shopId]/sales/new', params: { shopId } })}
    />
  );
}
