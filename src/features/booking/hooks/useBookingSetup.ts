import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import {
  useAlternativesQuery,
  useBarbersQuery,
  useBarbershopQuery,
  useServicesQuery,
} from '@/features/barbershop';
import { isApiError } from '@/shared/api';
import { upcomingDays } from '@/shared/lib';
import { bookingKeys, fetchAvailability } from '../api/bookingApi';
import { groupSlotsByDayPart, useBookingDraft } from './bookingDraft';

/** Bookable horizon documented by the API; narrowed if the server says otherwise. */
const HORIZON_DAYS = 30;

/** Service, barber, day and slot of the booking being prepared. */
export function useBookingSetup(barbershopId: string, initialServiceId: string | undefined) {
  const draft = useBookingDraft();
  const { start, setDate, setService, setLastBookableDate, lastBookableDate } = draft;
  useEffect(() => start(barbershopId, initialServiceId ?? null), [start, barbershopId, initialServiceId]);

  const shop = useBarbershopQuery(barbershopId);
  const services = useServicesQuery(barbershopId);
  const barbers = useBarbersQuery(barbershopId);
  const timeZone = shop.data?.timezone;

  // With a single service there is nothing to choose.
  const onlyService = services.data?.length === 1 ? services.data[0] : undefined;
  useEffect(() => {
    if (onlyService && !draft.serviceId) setService(onlyService.id);
  }, [onlyService, draft.serviceId, setService]);

  const service = services.data?.find((s) => s.id === draft.serviceId);
  // Barbers who do the chosen service, as the API lists them.
  const eligibleBarbers = (barbers.data ?? []).filter((b) => service && b.serviceIds.includes(service.id));

  const days = useMemo(() => {
    if (!timeZone) return [];
    const all = upcomingDays(timeZone, HORIZON_DAYS);
    return lastBookableDate ? all.filter((d) => d.date <= lastBookableDate) : all;
  }, [timeZone, lastBookableDate]);
  useEffect(() => {
    const first = days[0];
    if (first && (!draft.date || !days.some((d) => d.date === draft.date))) setDate(first.date);
  }, [days, draft.date, setDate]);

  const availability = useQuery({
    queryKey: bookingKeys.availability(barbershopId, draft.serviceId ?? '', draft.date ?? '', draft.barberId),
    queryFn: () => fetchAvailability(barbershopId, draft.serviceId!, draft.date!, draft.barberId),
    enabled: Boolean(draft.serviceId && draft.date),
    staleTime: 0,
  });

  // DATE_OUT_OF_RANGE: the server tells the real horizon; limit the day picker to it.
  const rangeDetail =
    isApiError(availability.error) && availability.error.code === 'DATE_OUT_OF_RANGE'
      ? availability.error.details[0]
      : undefined;
  useEffect(() => {
    const last = rangeDetail?.lastBookableDate;
    if (typeof last === 'string' && last !== lastBookableDate) setLastBookableDate(last);
  }, [rangeDetail, lastBookableDate, setLastBookableDate]);

  const slots = availability.data?.slots ?? [];
  const noSlots = availability.data !== undefined && slots.length === 0;
  const alternatives = useAlternativesQuery(
    barbershopId,
    draft.serviceId ?? '',
    draft.date ?? undefined,
    noSlots,
  );

  return {
    draft,
    shop,
    services,
    barbers,
    service,
    eligibleBarbers,
    timeZone,
    days,
    availability,
    slotGroups: timeZone ? groupSlotsByDayPart(slots, timeZone) : [],
    noSlots,
    alternatives,
    canContinue: Boolean(service && draft.slot),
  };
}
