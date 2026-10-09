import { router } from 'expo-router';
import { ShopHomeScreen } from '@/features/shop-management';

export default function ShopHomeRoute() {
  return (
    <ShopHomeScreen
      onCreate={() => router.push('/create-shop')}
      onInvitations={() => router.push('/profile/invitations')}
      onOpen={(shopId, section) => router.push({ pathname: `/shop/[shopId]/${section}`, params: { shopId } })}
      onOpenAsBarber={(shopId, barberId, section, timeZone) =>
        router.push({
          pathname: `/shop/[shopId]/${section}`,
          params: { shopId, barberId, own: '1', timeZone },
        })
      }
    />
  );
}
