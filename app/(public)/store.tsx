import { router, useLocalSearchParams } from 'expo-router';
import { StoreScreen } from '@/features/ads';

/** "Tienda": for clients, or for barbershops (`?for=shop`, from the barbershop's home). */
export default function StoreRoute() {
  const { for: target } = useLocalSearchParams<{ for?: string }>();
  return (
    <StoreScreen
      audience={target === 'shop' ? 'BARBERSHOPS' : 'CLIENTS'}
      onOpenSponsor={(id) => router.push({ pathname: '/sponsor/[id]', params: { id } })}
      onOpenBarbershop={(id) => router.push({ pathname: '/barbershop/[id]', params: { id } })}
    />
  );
}
