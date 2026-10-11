import { router } from 'expo-router';
import { NotificationBell } from '@/features/notifications';
import { ExploreScreen } from '@/features/search';

export default function ExploreRoute() {
  return (
    <ExploreScreen
      onOpenBarbershop={(id) => router.push({ pathname: '/barbershop/[id]', params: { id } })}
      onOpenFilters={() => router.push('/search-filters')}
      headerRight={<NotificationBell onPress={() => router.push('/notifications')} />}
    />
  );
}
