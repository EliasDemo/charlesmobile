import { router } from 'expo-router';
import { WelcomeScreen } from '@/features/onboarding';
import { useAppMode } from '@/features/shop-management';
import { useSession } from '@/shared/api';

/** After the welcome, each choice lands where it makes sense. */
export default function WelcomeRoute() {
  const leave = (path: '/' | '/create-shop' | '/career' | '/shop') => router.replace(path);
  return (
    <WelcomeScreen
      onDone={(choice) => {
        const roles = useSession.getState().user?.roles ?? [];
        if (choice === 'shop') {
          if (roles.includes('OWNER')) {
            useAppMode.getState().setMode('shop');
            leave('/shop');
          } else leave('/create-shop');
        } else if (choice === 'barber') leave('/career');
        else leave('/');
      }}
    />
  );
}
