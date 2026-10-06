import { router } from 'expo-router';
import { ProfileScreen } from '@/features/profile';
import { env } from '@/shared/config';

export default function ProfileRoute() {
  return (
    <ProfileScreen
      onLogin={() => router.push({ pathname: '/login', params: { returnTo: '/profile' } })}
      onRegister={() => router.push('/register')}
      onVerifyEmail={(email) => router.push({ pathname: '/verify-email', params: { email } })}
      onEditProfile={() => router.push('/profile/edit')}
      onPreferences={() => router.push('/profile/preferences')}
      onFavorites={() => router.push('/profile/favorites')}
      onDesignSystem={env.isDevelopment ? () => router.push('/design-system') : undefined}
      onLoggedOut={() => router.replace('/profile')}
    />
  );
}
