import { router } from 'expo-router';
import { AdSlot, StoreButton } from '@/features/ads';
import { TodaySummary } from '@/features/business';
import { useMyCareerProfile } from '@/features/career';
import { JobBoardCard } from '@/features/jobs';
import { NotificationBell } from '@/features/notifications';
import { ShopHomeScreen } from '@/features/shop-management';

export default function ShopHomeRoute() {
  const career = useMyCareerProfile();
  const profile = career.data ?? null;
  return (
    <ShopHomeScreen
      jobBoardSlot={(variant) => (
        <JobBoardCard
          variant={variant}
          place={profile?.location ?? undefined}
          hasProfile={profile !== null}
          onOpenJobs={() => router.push('/jobs')}
          onOpenJob={(id) => router.push({ pathname: '/jobs/[id]', params: { id } })}
          onApplications={() => router.push('/jobs/applications')}
          onOffers={() => router.push('/jobs/offers')}
          onProfile={() => router.push(profile ? '/career' : '/career/edit')}
        />
      )}
      headerRight={
        <>
          <StoreButton onPress={() => router.push({ pathname: '/store', params: { for: 'shop' } })} />
          <NotificationBell onPress={() => router.push('/notifications')} />
        </>
      }
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
