import { router } from 'expo-router';
import { ProfileScreen } from '@/features/profile';
import { useAppMode, useCanManage, useEffectiveMode } from '@/features/shop-management';
import { env } from '@/shared/config';

export default function ProfileRoute() {
  const mode = useEffectiveMode();
  const canManage = useCanManage();
  const switchModeTo = canManage ? (mode === 'shop' ? 'client' : 'shop') : undefined;
  return (
    <ProfileScreen
      onLogin={() => router.push({ pathname: '/login', params: { returnTo: '/profile' } })}
      onRegister={() => router.push('/register')}
      onVerifyEmail={(email) => router.push({ pathname: '/verify-email', params: { email } })}
      onEditProfile={() => router.push('/profile/edit')}
      onChangePassword={() => router.push('/profile/password')}
      onCareer={() => router.push('/career')}
      onPreferences={() => router.push('/profile/preferences')}
      onFavorites={() => router.push('/profile/favorites')}
      onHelp={() => router.push('/support')}
      onMyReviews={() => router.push('/profile/reviews')}
      onWelcome={() => router.push('/welcome')}
      onDeleteAccount={() => router.push('/profile/delete-account')}
      switchModeTo={switchModeTo}
      onSwitchMode={() => {
        if (!switchModeTo) return;
        useAppMode.getState().setMode(switchModeTo);
        router.replace(switchModeTo === 'shop' ? '/shop' : '/');
      }}
      onCreateShop={() => router.push('/create-shop')}
      onInvitations={() => router.push('/profile/invitations')}
      onDesignSystem={env.isDevelopment ? () => router.push('/design-system') : undefined}
      onLoggedOut={() => router.replace('/profile')}
    />
  );
}
