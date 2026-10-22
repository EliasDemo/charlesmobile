import { router } from 'expo-router';
import { PreferencesScreen } from '@/features/profile';

export default function PreferencesRoute() {
  return (
    <PreferencesScreen
      onReplayTutorial={() => router.push('/welcome')}
      onChangePassword={() => router.push('/profile/password')}
      onHelp={() => router.push('/support')}
    />
  );
}
