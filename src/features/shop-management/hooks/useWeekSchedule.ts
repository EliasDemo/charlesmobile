import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { translateError } from '@/shared/api';
import { i18n } from '@/shared/i18n';
import { toMinutes } from '@/shared/ui';
import {
  fetchBarberSchedule,
  fetchBusinessHours,
  saveBarberSchedule,
  saveBusinessHours,
  shopKeys,
  type DaySchedule,
} from '../api/shopApi';

export interface Window {
  start: string;
  end: string;
}

/** Monday first, as people read a week; the API uses 0 = Sunday. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const DEFAULT_WINDOW: Window = { start: '09:00', end: '18:00' };

export type Week = Record<number, Window[]>;

export function toWeek(days: DaySchedule[]): Week {
  const week: Week = {};
  for (const d of WEEK_ORDER) week[d] = [];
  for (const day of days) week[day.dayOfWeek] = day.windows.map((w) => ({ start: w.start, end: w.end }));
  return week;
}

export function toDays(week: Week): DaySchedule[] {
  return WEEK_ORDER.filter((d) => (week[d] ?? []).length > 0).map((dayOfWeek) => ({
    dayOfWeek,
    windows: [...(week[dayOfWeek] ?? [])].sort((a, b) => toMinutes(a.start) - toMinutes(b.start)),
  }));
}

/**
 * Basic check before sending, so the user fixes it next to the day: every window ends after it
 * starts and windows of a day do not overlap. The backend validates again.
 */
export function weekIsValid(week: Week): boolean {
  return WEEK_ORDER.every((d) => {
    const windows = [...(week[d] ?? [])].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    return windows.every(
      (w, i) =>
        toMinutes(w.end) > toMinutes(w.start) &&
        (i === 0 || toMinutes(w.start) >= toMinutes(windows[i - 1]!.end)),
    );
  });
}

/**
 * Weekly hours of the barbershop, or of one barber when `barberId` is given (that one can also
 * "use the barbershop's hours", sent as an empty week).
 */
export function useWeekSchedule(
  shopId: string,
  barberId: string | undefined,
  { onSaved }: { onSaved: (message: string) => void },
) {
  const queryClient = useQueryClient();
  const key = barberId ? shopKeys.barberSchedule(shopId, barberId) : shopKeys.hours(shopId);
  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!barberId) {
        const hours = await fetchBusinessHours(shopId);
        return { timezone: hours.timezone, days: hours.days, inherits: false };
      }
      const schedule = await fetchBarberSchedule(shopId, barberId);
      return { timezone: schedule.timezone, days: schedule.days, inherits: schedule.inheritsBusinessHours };
    },
    staleTime: 0,
  });
  // Edits made by the user; until then, what the API has.
  const [editedWeek, setWeek] = useState<Week | null>(null);
  const [editedInherits, setInherits] = useState<boolean | null>(null);
  const [invalid, setInvalid] = useState(false);

  const loaded = query.data;
  const week = editedWeek ?? (loaded ? toWeek(loaded.days) : null);
  const inherits = editedInherits ?? loaded?.inherits ?? false;

  const update = (day: number, windows: Window[]) => setWeek({ ...(week ?? {}), [day]: windows });

  const save = useMutation({
    mutationFn: async () => {
      const days = barberId && inherits ? [] : toDays(week!);
      const result = barberId
        ? await saveBarberSchedule(shopId, barberId, days)
        : await saveBusinessHours(shopId, days);
      return result.bookingsOutsideSchedule;
    },
    onSuccess: (outside) => {
      void queryClient.invalidateQueries({ queryKey: key });
      onSaved(outside > 0 ? i18n.t('shop:hours.outside', { count: outside }) : i18n.t('shop:hours.saved'));
    },
  });

  return {
    query,
    timezone: loaded?.timezone,
    week,
    isBarber: Boolean(barberId),
    inherits,
    setInherits,
    toggleDay: (day: number, open: boolean) => update(day, open ? [DEFAULT_WINDOW] : []),
    setWindow: (day: number, index: number, window: Window) =>
      update(
        day,
        (week?.[day] ?? []).map((w, i) => (i === index ? window : w)),
      ),
    addWindow: (day: number) => {
      const windows = week?.[day] ?? [];
      const last = windows[windows.length - 1];
      update(day, [...windows, last ? { start: last.end, end: last.end } : DEFAULT_WINDOW]);
    },
    removeWindow: (day: number, index: number) =>
      update(
        day,
        (week?.[day] ?? []).filter((_, i) => i !== index),
      ),
    invalid,
    save: () => {
      if (!week) return;
      const ok = (barberId && inherits) || weekIsValid(week);
      setInvalid(!ok);
      if (ok) save.mutate();
    },
    isSaving: save.isPending,
    error: save.error ? translateError(save.error).message : null,
  };
}
