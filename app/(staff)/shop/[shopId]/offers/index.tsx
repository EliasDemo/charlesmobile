import { useLocalSearchParams } from 'expo-router';
import { ShopOffersScreen } from '@/features/jobs';

export default function ShopOffersRoute() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return <ShopOffersScreen shopId={shopId} />;
}
