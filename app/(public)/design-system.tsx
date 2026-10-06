import { Redirect } from 'expo-router';
import { DesignSystemScreen } from '@/features/design-system';
import { env } from '@/shared/config';

export default function DesignSystemRoute() {
  if (!env.isDevelopment) return <Redirect href="/" />;
  return <DesignSystemScreen />;
}
