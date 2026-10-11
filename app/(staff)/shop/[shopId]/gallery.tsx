import { useLocalSearchParams } from 'expo-router';
import { ShopGalleryScreen } from '@/features/shop-management';

/** The barbershop's gallery, or only the barber's own (own=1). */
export default function ShopGalleryRoute() {
  const { shopId, barberId, own } = useLocalSearchParams<{
    shopId: string;
    barberId?: string;
    own?: string;
  }>();
  return <ShopGalleryScreen shopId={shopId} ownBarberId={own === '1' ? barberId : undefined} />;
}
