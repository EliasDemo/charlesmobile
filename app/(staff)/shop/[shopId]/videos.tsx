import { useLocalSearchParams } from 'expo-router';
import { ShopVideosScreen } from '@/features/videos';

export default function ShopVideosRoute() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return <ShopVideosScreen shopId={shopId} />;
}
