import { router } from 'expo-router';
import { ExploreScreen } from '@/features/search';

export default function ExploreRoute() {
  return (
    <ExploreScreen
      onOpenBarbershop={(id) => router.push({ pathname: '/barbershop/[id]', params: { id } })}
      onOpenFilters={() => router.push('/search-filters')}
    />
  );
}
