import { router } from 'expo-router';
import { AdSlot, StoreButton } from '@/features/ads';
import { NotificationBell } from '@/features/notifications';
import { ExploreScreen } from '@/features/search';

const openSponsor = (id: string) => router.push({ pathname: '/sponsor/[id]', params: { id } });

export default function ExploreRoute() {
  return (
    <ExploreScreen
      onOpenBarbershop={(id) => router.push({ pathname: '/barbershop/[id]', params: { id } })}
      onOpenFilters={() => router.push('/search-filters')}
      onOpenBarbers={() => router.push('/barbers')}
      onOpenJobs={() => router.push('/jobs')}
      onOpenFace={() => router.push('/face')}
      headerRight={
        <>
          <StoreButton onPress={() => router.push('/store')} />
          <NotificationBell onPress={() => router.push('/notifications')} />
        </>
      }
      homeBanner={<AdSlot slot="home_banner" onOpenSponsor={openSponsor} />}
      resultsTop={<AdSlot slot="search_top" onOpenSponsor={openSponsor} />}
    />
  );
}
