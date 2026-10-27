import { useLocalSearchParams } from 'expo-router';
import { SellerAccountScreen } from '@/features/business';

export default function SellerRoute() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return <SellerAccountScreen shopId={shopId} />;
}
