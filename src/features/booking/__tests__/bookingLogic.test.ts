import { daySlots } from '@test/mockApi';
import { groupSlotsByDayPart, localHour, useBookingDraft } from '../hooks/bookingDraft';
import { PENDING_POLL_MS, pollInterval } from '../hooks/useBooking';

beforeEach(() => useBookingDraft.getState().reset());

describe('Idempotency-Key lifecycle', () => {
  it('keeps the same key for retries of one attempt', () => {
    const draft = useBookingDraft.getState();
    const first = draft.keyForAttempt();
    expect(first).toMatch(/^[0-9a-f-]{36}$/i);
    expect(useBookingDraft.getState().keyForAttempt()).toBe(first);
  });

  it('creates a new key for a new attempt or a changed selection', () => {
    const draft = useBookingDraft.getState();
    const first = draft.keyForAttempt();
    draft.endAttempt();
    const second = useBookingDraft.getState().keyForAttempt();
    expect(second).not.toBe(first);
    useBookingDraft.getState().setSlot({ startAt: 'a', endAt: 'b' });
    expect(useBookingDraft.getState().idempotencyKey).toBeNull();
  });
});

describe('booking draft', () => {
  it('keeps the selection when coming back to the same barbershop (after login)', () => {
    const draft = useBookingDraft.getState();
    draft.start('shop-1', 'svc-1');
    draft.setBarber('barber-1');
    draft.setDate('2030-01-07');
    draft.setSlot({ startAt: 's', endAt: 'e' });
    useBookingDraft.getState().start('shop-1', null);
    expect(useBookingDraft.getState()).toMatchObject({
      serviceId: 'svc-1',
      barberId: 'barber-1',
      slot: { startAt: 's' },
    });
    useBookingDraft.getState().start('shop-2', null);
    expect(useBookingDraft.getState()).toMatchObject({ barbershopId: 'shop-2', serviceId: null, slot: null });
  });

  it('changing the service clears barber and slot; a taken slot keeps the rest and leaves a notice', () => {
    const draft = useBookingDraft.getState();
    draft.start('shop-1', 'svc-1');
    draft.setBarber('barber-1');
    draft.setDate('2030-01-07');
    draft.setSlot({ startAt: 's', endAt: 'e' });
    useBookingDraft.getState().slotTaken();
    expect(useBookingDraft.getState()).toMatchObject({
      serviceId: 'svc-1',
      barberId: 'barber-1',
      date: '2030-01-07',
      slot: null,
      notice: 'slotTaken',
    });
    useBookingDraft.getState().setService('svc-2');
    expect(useBookingDraft.getState()).toMatchObject({ barberId: null, slot: null, notice: null });
  });
});

describe('slots by part of the day, in the barbershop zone', () => {
  it('groups morning, afternoon and evening by local hour', () => {
    // Lima is UTC-5: 14:00Z = 09:00, 19:00Z = 14:00, 23:30Z = 18:30.
    const day = daySlots('2030-01-07', [
      '2030-01-07T14:00:00.000Z',
      '2030-01-07T19:00:00.000Z',
      '2030-01-07T23:30:00.000Z',
    ]);
    expect(localHour('2030-01-07T14:00:00.000Z', 'America/Lima')).toBe(9);
    const groups = groupSlotsByDayPart(day.slots, 'America/Lima');
    expect(groups.map((g) => [g.part, g.slots.length])).toEqual([
      ['morning', 1],
      ['afternoon', 1],
      ['evening', 1],
    ]);
  });

  it('omits empty parts', () => {
    const day = daySlots('2030-01-07', ['2030-01-07T14:00:00.000Z']);
    expect(groupSlotsByDayPart(day.slots, 'America/Lima').map((g) => g.part)).toEqual(['morning']);
  });
});

describe('pending booking polling', () => {
  it('polls only a pending booking while its screen is visible', () => {
    expect(pollInterval('PENDING_PAYMENT', true)).toBe(PENDING_POLL_MS);
    expect(PENDING_POLL_MS).toBe(10_000);
    expect(pollInterval('PENDING_PAYMENT', false)).toBe(false);
    for (const status of ['CONFIRMED', 'EXPIRED', 'CANCELLED', 'ATTENDED', 'NO_SHOW'] as const) {
      expect(pollInterval(status, true)).toBe(false);
    }
  });
});
