import { router } from 'expo-router';
import { AdSlot } from '@/features/ads';
import { TodaySummary } from '@/features/business';
import { NotificationBell } from '@/features/notifications';
import { ShopHomeScreen } from '@/features/shop-management';

export default function ShopHomeRoute() {
  return (
    <ShopHomeScreen
      headerRight={<NotificationBell onPress={() => router.push('/notifications')} />}
      todaySlot={(shopId) => (
        <TodaySummary
          shopId={shopId}
          onNewSale={() => router.push({ pathname: '/shop/[shopId]/sales/new', params: { shopId } })}
          onOpenCash={() => router.push({ pathname: '/shop/[shopId]/cash', params: { shopId } })}
        />
      )}
      bottomSlot={
        <AdSlot
          slot="shop_dashboard"
          onOpenSponsor={(id) => router.push({ pathname: '/sponsor/[id]', params: { id } })}
        />
      }
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
