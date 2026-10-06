import { router } from 'expo-router';
import { HomeScreen } from '@/features/health';
import { env } from '@/shared/config';

export default function HomeRoute() {
  return (
    <HomeScreen
      apiUrl={env.apiUrl}
      onOpenDesignSystem={env.isDevelopment ? () => router.push('/design-system') : undefined}
    />
  );
}
