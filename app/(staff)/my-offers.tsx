import { Redirect } from 'expo-router';
import { useShopHome } from '@/features/shop-management';
import { LoadingState } from '@/shared/ui';

/** "Ofertas enviadas" from a notice: those of the barbershop being managed. */
export default function MyOffersResolver() {
  const { currentId, mine } = useShopHome();
  if (mine.isPending) return <LoadingState />;
  if (!currentId) return <Redirect href="/shop" />;
  return <Redirect href={{ pathname: '/shop/[shopId]/offers', params: { shopId: currentId } }} />;
}
