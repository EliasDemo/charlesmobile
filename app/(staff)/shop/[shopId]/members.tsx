import { useLocalSearchParams } from 'expo-router';
import { MembersScreen } from '@/features/shop-management';

export default function MembersRoute() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return <MembersScreen shopId={shopId} />;
}
