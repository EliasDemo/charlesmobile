import { router } from 'expo-router';
import { HomeScreen } from '@/features/health';
import { env } from '@/shared/config';

// Explore arrives in M3; until then the tab shows the server status.
export default function ExploreRoute() {
  return (
    <HomeScreen
      apiUrl={env.apiUrl}
      onOpenDesignSystem={env.isDevelopment ? () => router.push('/design-system') : undefined}
    />
  );
}
