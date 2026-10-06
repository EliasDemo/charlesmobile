import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { nextPageParam } from '@/shared/api';
import { dayOfWeekIn } from '@/shared/lib';
import {
  LATEST_REVIEWS,
  barbershopKeys,
  fetchAlternatives,
  fetchBarbers,
  fetchBarbershop,
  fetchBusinessHours,
  fetchNextSlot,
  fetchReviews,
  fetchServices,
  type ReviewFilters,
  type ReviewPage,
  type Service,
} from '../api/barbershopApi';

/** Detail screen: the shop, then each section loads (and fails) on its own. */
export function useBarbershop(id: string) {
  const shop = useQuery({ queryKey: barbershopKeys.detail(id), queryFn: () => fetchBarbershop(id) });
  const ready = shop.data !== undefined;
  const hours = useQuery({
    queryKey: barbershopKeys.hours(id),
    queryFn: () => fetchBusinessHours(id),
    enabled: ready,
  });
  const services = useQuery({
    queryKey: barbershopKeys.services(id),
    queryFn: () => fetchServices(id),
    enabled: ready,
  });
  const barbers = useQuery({
    queryKey: barbershopKeys.barbers(id),
    queryFn: () => fetchBarbers(id),
    enabled: ready,
  });
  const latestReviews = useQuery({
    queryKey: barbershopKeys.latestReviews(id),
    queryFn: () => fetchReviews(id, { rating: null, barberId: null }, undefined, LATEST_REVIEWS),
    enabled: ready,
  });

  return {
    shop,
    hours,
    services,
    barbers,
    latestReviews,
    /** Today in the shop's zone, to highlight it in the weekly hours. */
    todayDayOfWeek: shop.data ? dayOfWeekIn(shop.data.timezone) : null,
    /** Services grouped by category, in the order the API returns them. */
    servicesByCategory: groupByCategory(services.data ?? []),
  };
}

function groupByCategory(services: Service[]) {
  const groups = new Map<string, { name: string; services: Service[] }>();
  for (const service of services) {
    const group = groups.get(service.category.key) ?? { name: service.category.name, services: [] };
    group.services.push(service);
    groups.set(service.category.key, group);
  }
  return [...groups.entries()].map(([key, group]) => ({ key, ...group }));
}

/** Service screen: next slot, and other shops when there is none. Booking itself is M4. */
export function useServiceAvailability(barbershopId: string, serviceId: string) {
  const shop = useQuery({
    queryKey: barbershopKeys.detail(barbershopId),
    queryFn: () => fetchBarbershop(barbershopId),
  });
  const services = useQuery({
    queryKey: barbershopKeys.services(barbershopId),
    queryFn: () => fetchServices(barbershopId),
  });
  const nextSlot = useQuery({
    queryKey: barbershopKeys.nextSlot(barbershopId, serviceId),
    queryFn: () => fetchNextSlot(barbershopId, serviceId),
    staleTime: 60 * 1000,
  });
  const noSlot = nextSlot.data !== undefined && nextSlot.data.slot === null;
  const alternatives = useQuery({
    queryKey: barbershopKeys.alternatives(barbershopId, serviceId),
    queryFn: () => fetchAlternatives(barbershopId, serviceId),
    enabled: noSlot,
    staleTime: 60 * 1000,
  });
  const service = services.data?.find((s) => s.id === serviceId);
  return {
    shop,
    services,
    service,
    serviceMissing: services.data !== undefined && !service,
    nextSlot,
    noSlot,
    alternatives,
  };
}

/** All reviews, filterable by stars and barber, cursor paginated. */
export function useReviews(barbershopId: string) {
  const [filters, setFilters] = useState<ReviewFilters>({ rating: null, barberId: null });
  const barbers = useQuery({
    queryKey: barbershopKeys.barbers(barbershopId),
    queryFn: () => fetchBarbers(barbershopId),
  });
  // Usually cached from the detail; its zone formats the review dates.
  const shop = useQuery({
    queryKey: barbershopKeys.detail(barbershopId),
    queryFn: () => fetchBarbershop(barbershopId),
  });
  const query = useInfiniteQuery({
    queryKey: barbershopKeys.reviews(barbershopId, filters),
    queryFn: ({ pageParam }) => fetchReviews(barbershopId, filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: ReviewPage) => nextPageParam(last),
  });
  return {
    filters,
    setRating: (rating: number | null) =>
      setFilters((f) => ({ ...f, rating: f.rating === rating ? null : rating })),
    setBarber: (barberId: string | null) => setFilters((f) => ({ ...f, barberId })),
    barbers,
    shop,
    hasFilters: filters.rating !== null || filters.barberId !== null,
    query: {
      items: query.data?.pages.flatMap((page) => page.items),
      error: query.error,
      hasNextPage: query.hasNextPage,
      isFetchingNextPage: query.isFetchingNextPage,
      isRefetching: query.isRefetching,
      fetchNextPage: query.fetchNextPage,
      refetch: query.refetch,
    },
  };
}
