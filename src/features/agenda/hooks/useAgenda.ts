import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useBarbersList, useShopHome } from '@/features/shop-management';
import { translateError } from '@/shared/api';
import { env } from '@/shared/config';
import { daysAround, toLocalDate } from '@/shared/lib';
import {
  agendaKeys,
  correctAttendance,
  fetchMyAgenda,
  fetchShopAgenda,
  markAttended,
  markNoShow,
  type AgendaItem,
} from '../api/agendaApi';

export type AgendaView = 'mine' | 'shop';

/**
 * Days offered in the picker. Provisional until the backend publishes its range (it will answer
 * DATE_OUT_OF_RANGE outside it): a week back covers the 48 h corrections, a month ahead to plan.
 */
export const DAYS_BACK = 7;
export const DAYS_AHEAD = 30;

/** Reason rules the backend applies to a correction (3 to 300 characters, trimmed). */
export const REASON_MIN = 3;
export const REASON_MAX = 300;

/** The agenda refreshes itself while open, so "por marcar" stays current. */
const REFRESH_MS = 60_000;

/**
 * Day agenda: the barbershop's (owner or manager), or the account's own as a barber. What can be
 * done with each booking comes only from the API (`actions`); after any action the agenda is
 * fetched again so those flags and `pendingAttention` stay the backend's.
 */
export function useAgenda() {
  const queryClient = useQueryClient();
  const home = useShopHome();
  const canShop = home.shops.length > 0;
  const ownProfile = home.barberProfiles.find((p) => p.isActive) ?? null;
  const canMine = ownProfile !== null;

  const [chosenView, setView] = useState<AgendaView | null>(null);
  const view: AgendaView = chosenView ?? (canShop ? 'shop' : 'mine');
  const shopId = home.currentId;

  const timeZone =
    (view === 'shop' ? home.shop.data?.timezone : ownProfile?.barbershop.timezone) ?? env.defaultTimeZone;
  const today = toLocalDate(new Date().toISOString(), timeZone);
  const days = useMemo(() => daysAround(timeZone, DAYS_BACK, DAYS_AHEAD), [timeZone]);
  const [chosenDate, setDate] = useState<string | null>(null);
  const date = chosenDate ?? today;
  const [barberId, setBarberId] = useState<string | null>(null);

  const barbers = useBarbersList(shopId ?? '', view === 'shop');
  const agenda = useQuery({
    queryKey: view === 'shop' ? agendaKeys.shop(shopId ?? '', date, barberId) : agendaKeys.mine(date),
    queryFn: () => (view === 'shop' ? fetchShopAgenda(shopId!, date, barberId) : fetchMyAgenda(date)),
    enabled: view === 'shop' ? shopId !== null : canMine,
    staleTime: 0,
    refetchInterval: REFRESH_MS,
  });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: agendaKeys.all });
  const [actionError, setActionError] = useState<string | null>(null);
  const onError = (error: unknown) => {
    setActionError(translateError(error).message);
    refresh();
  };

  const attended = useMutation({
    mutationFn: (item: AgendaItem) => markAttended(item.bookingId),
    onMutate: () => setActionError(null),
    onSuccess: refresh,
    onError,
  });

  // No-show: the client loses the payment, so it is confirmed first.
  const [noShowItem, setNoShowItem] = useState<AgendaItem | null>(null);
  const noShow = useMutation({
    mutationFn: (item: AgendaItem) => markNoShow(item.bookingId),
    onMutate: () => setActionError(null),
    onSuccess: () => {
      setNoShowItem(null);
      refresh();
    },
    onError: (error) => {
      setNoShowItem(null);
      onError(error);
    },
  });

  // Correction ATTENDED ↔ NO_SHOW, with a required reason.
  const [correcting, setCorrecting] = useState<AgendaItem | null>(null);
  const [reason, setReason] = useState('');
  const correction = useMutation({
    mutationFn: (item: AgendaItem) =>
      correctAttendance(item.bookingId, {
        status: item.status === 'ATTENDED' ? 'NO_SHOW' : 'ATTENDED',
        reason: reason.trim(),
      }),
    onMutate: () => setActionError(null),
    onSuccess: () => {
      setCorrecting(null);
      setReason('');
      refresh();
    },
    onError: (error) => {
      setCorrecting(null);
      onError(error);
    },
  });
  const reasonLength = reason.trim().length;

  return {
    view,
    setView: (next: AgendaView) => {
      setView(next);
      setBarberId(null);
    },
    /** Both views are offered only to an account that is a manager and an active barber. */
    canSwitch: canShop && canMine,
    hasAccess: canShop || canMine,
    access: home.mine,
    shops: home.shops,
    shopId,
    selectShop: (id: string) => {
      home.selectShop(id);
      setBarberId(null);
    },
    timeZone,
    today,
    days,
    date,
    setDate,
    barbers: view === 'shop' ? (barbers.data ?? []) : [],
    barberId,
    setBarberId,
    agenda,
    refresh,
    isRefreshing: agenda.isRefetching,
    actionError,
    markAttended: (item: AgendaItem) => attended.mutate(item),
    attendingId: attended.isPending ? attended.variables?.bookingId : null,
    noShowItem,
    askNoShow: setNoShowItem,
    cancelNoShow: () => setNoShowItem(null),
    confirmNoShow: () => noShowItem && noShow.mutate(noShowItem),
    isMarkingNoShow: noShow.isPending,
    correcting,
    askCorrection: (item: AgendaItem) => {
      setReason('');
      setCorrecting(item);
    },
    cancelCorrection: () => setCorrecting(null),
    reason,
    setReason,
    reasonValid: reasonLength >= REASON_MIN && reasonLength <= REASON_MAX,
    confirmCorrection: () => correcting && correction.mutate(correcting),
    isCorrecting: correction.isPending,
  };
}
