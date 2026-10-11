import { create } from 'zustand';
import { newIdempotencyKey } from '@/shared/api';
import type { Slot } from '../api/bookingApi';

/** Message carried back to the slot picker (e.g. the chosen slot was just taken). */
export type DraftNotice = 'slotTaken' | null;

interface BookingDraftState {
  barbershopId: string | null;
  serviceId: string | null;
  /** null = "cualquiera disponible". */
  barberId: string | null;
  date: string | null;
  slot: Pick<Slot, 'startAt' | 'endAt'> | null;
  /**
   * One key per user attempt: created on "Confirmar", kept while that attempt is retried
   * (network error, 503), dropped when the selection changes or the attempt ends.
   */
  idempotencyKey: string | null;
  notice: DraftNotice;
  /** Last bookable day the server reported (DATE_OUT_OF_RANGE); narrows the day picker. */
  lastBookableDate: string | null;
  setLastBookableDate: (date: string) => void;
  start: (barbershopId: string, serviceId: string | null, barberId?: string | null) => void;
  setService: (serviceId: string) => void;
  setBarber: (barberId: string | null) => void;
  setDate: (date: string) => void;
  setSlot: (slot: Pick<Slot, 'startAt' | 'endAt'> | null) => void;
  keyForAttempt: () => string;
  endAttempt: () => void;
  slotTaken: () => void;
  clearNotice: () => void;
  reset: () => void;
}

const EMPTY = {
  barbershopId: null,
  serviceId: null,
  barberId: null,
  date: null,
  slot: null,
  idempotencyKey: null,
  notice: null,
  lastBookableDate: null,
} as const;

/** The booking being prepared. Only in memory: it survives login, sign-up and email verification. */
export const useBookingDraft = create<BookingDraftState>((set, get) => ({
  ...EMPTY,
  start: (barbershopId, serviceId, barberId = null) => {
    const current = get();
    // Coming back to the same barbershop (e.g. after login) keeps the selection.
    if (
      current.barbershopId === barbershopId &&
      (!serviceId || current.serviceId === serviceId) &&
      (!barberId || current.barberId === barberId)
    )
      return;
    set({ ...EMPTY, barbershopId, serviceId, barberId });
  },
  setService: (serviceId) =>
    set({ serviceId, barberId: null, slot: null, idempotencyKey: null, notice: null }),
  setBarber: (barberId) => set({ barberId, slot: null, idempotencyKey: null, notice: null }),
  setDate: (date) => set({ date, slot: null, idempotencyKey: null, notice: null }),
  setSlot: (slot) => set({ slot, idempotencyKey: null, notice: null }),
  keyForAttempt: () => {
    const existing = get().idempotencyKey;
    if (existing) return existing;
    const key = newIdempotencyKey();
    set({ idempotencyKey: key });
    return key;
  },
  endAttempt: () => set({ idempotencyKey: null }),
  setLastBookableDate: (lastBookableDate) => set({ lastBookableDate }),
  slotTaken: () => set({ slot: null, idempotencyKey: null, notice: 'slotTaken' }),
  clearNotice: () => set({ notice: null }),
  reset: () => set(EMPTY),
}));

export type DayPart = 'morning' | 'afternoon' | 'evening';

/** Local hour (0–23) of an instant in the barbershop's zone. */
export function localHour(iso: string, timeZone: string): number {
  const hour = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(
    new Date(iso),
  );
  return Number(hour);
}

/** Groups slots for display: morning before 12:00, afternoon before 18:00, evening after. */
export function groupSlotsByDayPart(slots: Slot[], timeZone: string): { part: DayPart; slots: Slot[] }[] {
  const groups: Record<DayPart, Slot[]> = { morning: [], afternoon: [], evening: [] };
  for (const slot of slots) {
    const hour = localHour(slot.startAt, timeZone);
    groups[hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'].push(slot);
  }
  return (['morning', 'afternoon', 'evening'] as const)
    .map((part) => ({ part, slots: groups[part] }))
    .filter((group) => group.slots.length > 0);
}
