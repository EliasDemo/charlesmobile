import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { translateError } from '@/shared/api';
import { upcomingDays, zonedTimeToIso } from '@/shared/lib';
import { shopKeys, updateShopStatus, type ManagedShop } from '../api/shopApi';
import { LIMITS } from '../schemas/limits';

/** Days offered for the expected reopening (from tomorrow, in the barbershop zone). */
const REOPEN_DAYS = 60;
/** The reopening is stored as the start of that day in the barbershop zone. */
const REOPEN_TIME = '00:00';

/**
 * Open, or temporarily closed with an optional reason and reopening day. Starts from the current
 * state of the loaded barbershop (the screen renders it only once loaded).
 */
export function useShopStatus(shop: ManagedShop, { onSaved }: { onSaved: () => void }) {
  const queryClient = useQueryClient();
  const [closed, setClosed] = useState(shop.status === 'TEMPORARILY_CLOSED');
  const [reason, setReason] = useState(shop.closure?.reason ?? '');
  const [reopenDate, setReopenDate] = useState<string | null>(null);
  const days = useMemo(() => upcomingDays(shop.timezone, REOPEN_DAYS + 1).slice(1), [shop.timezone]);

  const mutation = useMutation({
    mutationFn: () =>
      updateShopStatus(
        shop.id,
        closed
          ? {
              status: 'TEMPORARILY_CLOSED',
              ...(reason.trim() ? { reason: reason.trim() } : {}),
              ...(reopenDate
                ? { expectedReopenAt: zonedTimeToIso(reopenDate, REOPEN_TIME, shop.timezone) }
                : {}),
            }
          : { status: 'OPEN' },
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData(shopKeys.detail(updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: shopKeys.mine });
      onSaved();
    },
  });

  // Optional, but when written it must have at least 2 characters (API: 2 to 200).
  const reasonLength = reason.trim().length;
  const reasonError: 'form.min2' | null =
    closed && reasonLength > 0 && reasonLength < LIMITS.closureReason.min ? 'form.min2' : null;

  return {
    closed,
    reasonError,
    setClosed,
    reason,
    setReason,
    reopenDate,
    setReopenDate,
    days,
    save: () => {
      if (!reasonError) mutation.mutate();
    },
    isSaving: mutation.isPending,
    error: mutation.error ? translateError(mutation.error).message : null,
  };
}
