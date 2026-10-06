import { router } from 'expo-router';
import { ProfileScreen } from '@/features/profile';

export default function ProfileRoute() {
  return (
    <ProfileScreen
      onLogin={() => router.push({ pathname: '/login', params: { returnTo: '/profile' } })}
      onRegister={() => router.push('/register')}
      onVerifyEmail={(email) => router.push({ pathname: '/verify-email', params: { email } })}
      onEditProfile={() => router.push('/profile/edit')}
      onPreferences={() => router.push('/profile/preferences')}
      onLoggedOut={() => router.replace('/profile')}
    />
  );
}
