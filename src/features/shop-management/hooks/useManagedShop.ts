import { useQuery } from '@tanstack/react-query';
import { fetchManagedShop, shopKeys } from '../api/shopApi';

/** A barbershop as its managers see it (status, closure, role…). */
export function useManagedShop(shopId: string) {
  return useQuery({ queryKey: shopKeys.detail(shopId), queryFn: () => fetchManagedShop(shopId) });
}
