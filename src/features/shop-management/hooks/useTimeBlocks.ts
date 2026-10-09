import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { isApiError, translateError } from '@/shared/api';
import { i18n } from '@/shared/i18n';
import { upcomingDays, zonedTimeToIso } from '@/shared/lib';
import { toMinutes } from '@/shared/ui';
import {
  createTimeBlock,
  deleteTimeBlock,
  fetchManagedBarbers,
  fetchTimeBlocks,
  shopKeys,
  type TimeBlock,
  type TimeBlockType,
} from '../api/shopApi';

/** Bookable horizon documented by the API: blocks beyond it make no sense. */
const HORIZON_DAYS = 30;

/**
 * Blocks of a barbershop. A barber managing only their own blocks passes `ownBarberId`: the
 * list and the new block are limited to that barber.
 */
export function useTimeBlocks(shopId: string, timeZone: string | undefined, ownBarberId?: string) {
  const queryClient = useQueryClient();
  const blocks = useQuery({
    queryKey: shopKeys.blocks(shopId),
    queryFn: () => fetchTimeBlocks(shopId),
    staleTime: 0,
  });
  const barbers = useQuery({
    queryKey: shopKeys.barbers(shopId),
    queryFn: () => fetchManagedBarbers(shopId),
    enabled: !ownBarberId,
  });
  const [deleting, setDeleting] = useState<TimeBlock | null>(null);
  const remove = useMutation({
    mutationFn: (blockId: string) => deleteTimeBlock(shopId, blockId),
    onSuccess: () => {
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: shopKeys.blocks(shopId) });
    },
  });

  const list = ownBarberId ? blocks.data?.filter((b) => b.barberId === ownBarberId) : blocks.data;

  return {
    blocks: { ...blocks, data: list },
    barbers: barbers.data ?? [],
    timeZone,
    deleting,
    askDelete: setDeleting,
    cancelDelete: () => setDeleting(null),
    confirmDelete: () => deleting && remove.mutate(deleting.id),
    isDeleting: remove.isPending,
    deleteError: remove.error ? translateError(remove.error).message : null,
  };
}

export function useTimeBlockForm(
  shopId: string,
  timeZone: string,
  { ownBarberId, onDone }: { ownBarberId?: string; onDone: () => void },
) {
  const queryClient = useQueryClient();
  const days = useMemo(() => upcomingDays(timeZone, HORIZON_DAYS), [timeZone]);
  const [barberId, setBarberId] = useState<string | null>(ownBarberId ?? null);
  const [type, setType] = useState<TimeBlockType>('BREAK');
  const [date, setDate] = useState<string>(days[0]!.date);
  const [from, setFrom] = useState('13:00');
  const [to, setTo] = useState('14:00');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      createTimeBlock(shopId, {
        ...(barberId ? { barberId } : {}),
        type,
        startAt: zonedTimeToIso(date, from, timeZone),
        endAt: zonedTimeToIso(date, to, timeZone),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: shopKeys.blocks(shopId) });
      onDone();
    },
    onError: (err) => {
      if (isApiError(err) && err.code === 'BLOCK_OVERLAPS_BOOKINGS') {
        const count = err.details.find((d) => typeof d.count === 'number')?.count;
        if (typeof count === 'number') return setError(i18n.t('shop:blocks.overlaps', { count }));
      }
      setError(translateError(err).message);
    },
  });

  return {
    days,
    barberId,
    setBarberId,
    fixedBarber: Boolean(ownBarberId),
    type,
    setType,
    date,
    setDate,
    from,
    setFrom,
    to,
    setTo,
    reason,
    setReason,
    error,
    save: () => {
      setError(null);
      if (toMinutes(to) <= toMinutes(from)) return setError(i18n.t('shop:blocks.invalidRange'));
      create.mutate();
    },
    isSaving: create.isPending,
  };
}
