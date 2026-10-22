import { Redirect } from 'expo-router';
import { useShopHome } from '@/features/shop-management';
import { LoadingState } from '@/shared/ui';

/** "Ver mi plan" from anywhere: the plan of the barbershop being managed. */
export default function MyPlanResolver() {
  const { currentId, mine } = useShopHome();
  if (mine.isPending) return <LoadingState />;
  if (!currentId) return <Redirect href="/shop" />;
  return <Redirect href={{ pathname: '/shop/[shopId]/plan', params: { shopId: currentId } }} />;
}
