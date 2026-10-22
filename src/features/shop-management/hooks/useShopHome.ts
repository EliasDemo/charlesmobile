import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/shared/api';
import { fetchManagedShop, fetchMyBarberProfiles, fetchMyBarbershops, shopKeys } from '../api/shopApi';
import { useAppMode } from './appMode';

/** "Mi barbería": the barbershops this account manages and, if it is a barber, its profiles. */
export function useShopHome() {
  const isBarber = useSession((s) => s.user?.roles.includes('BARBER') ?? false);
  const selectedShopId = useAppMode((s) => s.selectedShopId);
  const selectShop = useAppMode((s) => s.selectShop);

  const mine = useQuery({ queryKey: shopKeys.mine, queryFn: fetchMyBarbershops, staleTime: 0 });
  const shops = mine.data ?? [];
  const currentId = shops.some((s) => s.id === selectedShopId) ? selectedShopId : (shops[0]?.id ?? null);
  const shop = useQuery({
    queryKey: shopKeys.detail(currentId ?? ''),
    queryFn: () => fetchManagedShop(currentId!),
    enabled: currentId !== null,
  });
  const barberProfiles = useQuery({
    queryKey: shopKeys.myBarber,
    queryFn: fetchMyBarberProfiles,
    enabled: isBarber,
  });

  const activeProfiles = (barberProfiles.data ?? []).filter((p) => p.isActive);
  return {
    /** A barber (or someone in barbershop mode) without a barbershop: looking for work. */
    seeking: mine.data !== undefined && shops.length === 0 && activeProfiles.length === 0,
    /** Works as a barber somewhere and does not run a barbershop. */
    employed: shops.length === 0 && activeProfiles.length > 0,
    mine,
    shops,
    currentId,
    selectShop,
    shop,
    barberProfiles: barberProfiles.data ?? [],
  };
}
