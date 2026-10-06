import { router } from 'expo-router';
import { FiltersScreen } from '@/features/search';

export default function SearchFiltersRoute() {
  return <FiltersScreen onApplied={() => router.back()} />;
}
