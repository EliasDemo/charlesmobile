import { useQueries } from '@tanstack/react-query';
import {
  fetchBusinessHours,
  fetchManagedBarbers,
  fetchManagedServices,
  shopKeys,
  type ManagedShop,
} from '../api/shopApi';

export type ReadinessCheck =
  | { key: 'published'; ok: boolean }
  | { key: 'hours'; ok: boolean }
  | { key: 'services'; ok: boolean }
  | { key: 'barbers'; ok: boolean }
  | { key: 'barberServices'; ok: boolean; names: string[] };

/** Where each check is fixed. */
export type ReadinessTarget = 'review' | 'hours' | 'services' | 'barbers';

export const READINESS_TARGET: Record<ReadinessCheck['key'], ReadinessTarget> = {
  published: 'review',
  hours: 'hours',
  services: 'services',
  barbers: 'barbers',
  barberServices: 'barbers',
};

/**
 * "Lista para reservar": why clients may see no slots, from what the API already returns (the
 * backend decides the availability; this only points to what is missing). Booking needs the
 * barbershop public and open, hours, an available service, and active barbers who do it.
 */
export function useReadiness(shop: ManagedShop | undefined) {
  const id = shop?.id ?? '';
  const [hours, services, barbers] = useQueries({
    queries: [
      {
        queryKey: [...shopKeys.hours(id), 'readiness'],
        queryFn: () => fetchBusinessHours(id),
        enabled: Boolean(shop),
      },
      { queryKey: shopKeys.services(id), queryFn: () => fetchManagedServices(id), enabled: Boolean(shop) },
      { queryKey: shopKeys.barbers(id), queryFn: () => fetchManagedBarbers(id), enabled: Boolean(shop) },
    ],
  });
  if (!shop || !hours.data || !services.data || !barbers.data) return { ready: null, checks: [] };

  const available = services.data.filter((s) => s.isAvailable).map((s) => s.id);
  const active = barbers.data.filter((b) => b.isActive);
  const withoutServices = active.filter((b) => !b.serviceIds.some((sid) => available.includes(sid)));
  const checks: ReadinessCheck[] = [
    { key: 'published', ok: shop.status === 'OPEN' },
    { key: 'hours', ok: hours.data.days.some((d) => d.windows.length > 0) },
    { key: 'services', ok: available.length > 0 },
    { key: 'barbers', ok: active.length > 0 },
    {
      key: 'barberServices',
      ok: withoutServices.length === 0,
      names: withoutServices.map((b) => b.displayName),
    },
  ];
  return { ready: checks.every((c) => c.ok), checks };
}
