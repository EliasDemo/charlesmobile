import { useLocalSearchParams } from 'expo-router';
import { SaleScreen } from '@/features/business';

export default function SaleRoute() {
  const { shopId, saleId } = useLocalSearchParams<{ shopId: string; saleId: string }>();
  return <SaleScreen shopId={shopId} saleId={saleId} />;
}
