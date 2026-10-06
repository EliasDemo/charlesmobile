import { router } from 'expo-router';
import { FavoritesScreen } from '@/features/favorites';

export default function FavoritesRoute() {
  return (
    <FavoritesScreen
      onOpenBarbershop={(id) => router.push({ pathname: '/barbershop/[id]', params: { id } })}
    />
  );
}
