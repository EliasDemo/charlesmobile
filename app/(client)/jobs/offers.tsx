import { router } from 'expo-router';
import { MyOffersScreen } from '@/features/jobs';
import { useAppMode } from '@/features/shop-management';

/** "Ofertas para ti". Accepting joins a team: go to "Mi barbería" to see the new workplace. */
export default function MyOffersRoute() {
  return (
    <MyOffersScreen
      onAccepted={() => {
        useAppMode.getState().setMode('shop');
        router.navigate('/shop');
      }}
    />
  );
}
