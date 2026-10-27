import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isApiError, useSession } from '@/shared/api';
import { i18n } from '@/shared/i18n';
import { showToast, translateErrorMessage } from '@/shared/ui';
import { fetchMyWaitlist, joinWaitlist, leaveWaitlist, waitlistKeys } from '../api/waitlistApi';

/** Parts of the day a person can ask for; `any` sends no range (any time that day). */
export type WaitlistWindow = 'any' | 'morning' | 'afternoon' | 'evening';

/** Minutes from local midnight in the barbershop zone, as the API expects them. */
export const WINDOW_MINUTES: Record<Exclude<WaitlistWindow, 'any'>, { from: number; to: number }> = {
  morning: { from: 0, to: 12 * 60 },
  afternoon: { from: 12 * 60, to: 18 * 60 },
  evening: { from: 18 * 60, to: 24 * 60 - 1 },
};

const LIMIT_STATUS = 409;

function waitlistError(err: unknown): string {
  if (isApiError(err) && err.status === LIMIT_STATUS) return i18n.t('waitlist:errors.limit');
  return translateErrorMessage(err);
}

/** "Avisarme si se libera un turno": signs up for a day, with an optional part of the day and barber. */
export function useJoinWaitlist(barbershopId: string, onJoined?: () => void) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const join = useMutation({
    mutationFn: (input: {
      serviceId: string;
      date: string;
      barberId: string | null;
      window: WaitlistWindow;
    }) =>
      joinWaitlist(barbershopId, {
        serviceId: input.serviceId,
        date: input.date,
        ...(input.barberId ? { barberId: input.barberId } : {}),
        ...(input.window === 'any'
          ? {}
          : { fromMinute: WINDOW_MINUTES[input.window].from, toMinute: WINDOW_MINUTES[input.window].to }),
      }),
    onMutate: () => setError(null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: waitlistKeys.all });
      showToast(i18n.t('waitlist:joined'));
      onJoined?.();
    },
    onError: (err) => setError(waitlistError(err)),
  });
  return {
    join: join.mutate,
    isJoining: join.isPending,
    error,
    clearError: () => setError(null),
  };
}

/** "Mis listas de espera": active first, then the ones already notified. */
export function useMyWaitlist() {
  const authenticated = useSession((s) => s.status === 'authenticated');
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: waitlistKeys.mine, queryFn: fetchMyWaitlist, enabled: authenticated });
  const leave = useMutation({
    mutationFn: leaveWaitlist,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: waitlistKeys.all }),
    // Already gone (404): the list simply refreshes.
    onError: (err) => {
      if (isApiError(err) && err.status === 404) {
        void queryClient.invalidateQueries({ queryKey: waitlistKeys.all });
        return;
      }
      showToast(waitlistError(err));
    },
  });
  const order = { NOTIFIED: 0, ACTIVE: 1, EXPIRED: 2, CANCELLED: 3 } as const;
  const items = query.data
    ?.filter((entry) => entry.status === 'ACTIVE' || entry.status === 'NOTIFIED')
    .sort((a, b) => order[a.status] - order[b.status] || a.date.localeCompare(b.date));
  return {
    query,
    items,
    leave: leave.mutate,
    leavingId: leave.isPending ? (leave.variables ?? null) : null,
  };
}
