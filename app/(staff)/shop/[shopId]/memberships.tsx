import { useLocalSearchParams } from 'expo-router';
import { ShopMembershipsScreen } from '@/features/memberships';
import { useShopHome } from '@/features/shop-management';

export default function ShopMembershipsRoute() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { shop } = useShopHome();
  return <ShopMembershipsScreen shopId={shopId} isOwner={shop.data?.myRole === 'OWNER'} />;
}
