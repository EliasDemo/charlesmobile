import { useQuery } from '@tanstack/react-query';
import {
  barbershopKeys,
  fetchAlternatives,
  fetchBarbers,
  fetchBarbershop,
  fetchServices,
} from '../api/barbershopApi';

// Shared queries of a barbershop. Other features (booking) use these so they read the same cache
// as the detail screen instead of repeating the requests.

export const useBarbershopQuery = (id: string | undefined) =>
  useQuery({
    queryKey: barbershopKeys.detail(id ?? ''),
    queryFn: () => fetchBarbershop(id!),
    enabled: Boolean(id),
  });

export const useServicesQuery = (id: string | undefined) =>
  useQuery({
    queryKey: barbershopKeys.services(id ?? ''),
    queryFn: () => fetchServices(id!),
    enabled: Boolean(id),
  });

export const useBarbersQuery = (id: string | undefined) =>
  useQuery({
    queryKey: barbershopKeys.barbers(id ?? ''),
    queryFn: () => fetchBarbers(id!),
    enabled: Boolean(id),
  });

/** Other shops with a slot for the same kind of service (on `date`, or the next days). */
export const useAlternativesQuery = (
  id: string,
  serviceId: string,
  date: string | undefined,
  enabled: boolean,
) =>
  useQuery({
    queryKey: barbershopKeys.alternatives(id, serviceId, date),
    queryFn: () => fetchAlternatives(id, serviceId, date),
    enabled,
    staleTime: 60 * 1000,
  });
