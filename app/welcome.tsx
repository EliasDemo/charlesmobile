import { router } from 'expo-router';
import { WelcomeScreen } from '@/features/onboarding';

export default function WelcomeRoute() {
  return <WelcomeScreen onDone={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;
}
