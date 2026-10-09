import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import {
  apiError,
  barber,
  barbershop,
  booking,
  cancellationPreview,
  createdBooking,
  daySlots,
  mockApi,
  searchResult,
  service,
} from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import { queryClient } from '@/shared/api';
import { upcomingDays } from '@/shared/lib';
import common from '@/shared/i18n/locales/es/common.json';
import errors from '@/shared/i18n/locales/es/errors.json';
import texts from '@/shared/i18n/locales/es/booking.json';
import { BookingScreen, BookScreen, MyBookingsScreen, SummaryScreen } from '..';
import { useBookingDraft } from '../hooks/bookingDraft';

jest.mock('expo-router', () => ({ ...jest.requireActual('expo-router'), useIsFocused: () => true }));

const SHOP = '01990000-0000-7000-8000-000000000065';
const SERVICE = '01990000-0000-7000-8000-00000000012d';
const BARBER = '01990000-0000-7000-8000-0000000000ca';
const page = <T,>(items: T[], nextCursor: string | null = null) => ({ items, nextCursor });

beforeEach(() => {
  resetAppState();
  useBookingDraft.getState().reset();
});

const shopRoutes = (overrides: Record<string, unknown> = {}) => ({
  'GET /api/v1/barbershops/{id}': { body: barbershop() },
  'GET /api/v1/barbershops/{id}/services': {
    body: page([service(), service({ id: 'svc-2', name: 'Barba' })]),
  },
  'GET /api/v1/barbershops/{id}/barbers': {
    body: page([
      barber({ serviceIds: [SERVICE] }),
      barber({ id: 'b-other', displayName: 'Solo barba', serviceIds: ['svc-2'] }),
    ]),
  },
  'GET /api/v1/barbershops/{id}/availability': {
    body: daySlots('2030-01-07', ['2030-01-07T14:00:00.000Z', '2030-01-07T19:00:00.000Z']),
  },
  ...overrides,
});
const api = (routes: Record<string, unknown>) => mockApi(routes as never);

const bookProps = () => ({
  barbershopId: SHOP,
  serviceId: SERVICE,
  onContinue: jest.fn(),
  onBack: jest.fn(),
  onOpenBarbershop: jest.fn(),
});

describe('BookScreen', () => {
  it('shows loading first', async () => {
    globalThis.fetch = jest.fn(() => new Promise<Response>(() => undefined)) as unknown as typeof fetch;
    await renderWithProviders(<BookScreen {...bookProps()} />);
    expect(screen.getByTestId('loading-state')).toBeTruthy();
  });

  it('lets the user pick barber, day and slot, in the barbershop zone, grouped by part of day', async () => {
    const calls = api(shopRoutes());
    const props = bookProps();
    await renderWithProviders(<BookScreen {...props} />);
    expect(await screen.findByText('09:00')).toBeTruthy();
    expect(screen.getByText(texts.book.parts.morning)).toBeTruthy();
    expect(screen.getByText('14:00')).toBeTruthy();
    expect(screen.getByText(texts.book.parts.afternoon)).toBeTruthy();
    // Only barbers who do the chosen service.
    expect(screen.getByText('Barbero Demo')).toBeTruthy();
    expect(screen.queryByText('Solo barba')).toBeNull();
    expect(screen.getByRole('button', { name: texts.book.continue })).toBeDisabled();

    await fireEvent.press(screen.getByText('Barbero Demo'));
    await waitFor(() =>
      expect(
        calls.fetchMock.mock.calls.some(([r]) => new URL(r.url).searchParams.get('barberId') === BARBER),
      ).toBe(true),
    );
    await fireEvent.press(await screen.findByText('09:00'));
    await fireEvent.press(screen.getByRole('button', { name: texts.book.continue }));
    expect(props.onContinue).toHaveBeenCalled();
    expect(useBookingDraft.getState()).toMatchObject({
      barbershopId: SHOP,
      serviceId: SERVICE,
      barberId: BARBER,
      slot: { startAt: '2030-01-07T14:00:00.000Z' },
    });
  });

  it('offers other barbershops when the day has no slots', async () => {
    api(
      shopRoutes({
        'GET /api/v1/barbershops/{id}/availability': { body: daySlots('2030-01-07', []) },
        'GET /api/v1/barbershops/{id}/alternatives': {
          body: {
            date: '2030-01-07',
            categoryKey: 'haircut',
            items: [
              {
                barbershop: searchResult({ id: 'other', name: 'Otra barbería' }),
                service: {
                  id: 'x',
                  name: 'Corte',
                  price: { amount: 3000, currency: 'PEN' },
                  durationMinutes: 30,
                },
                firstSlot: { startAt: '2030-01-07T15:00:00.000Z', endAt: '2030-01-07T15:30:00.000Z' },
              },
            ],
          },
        },
      }),
    );
    const props = bookProps();
    await renderWithProviders(<BookScreen {...props} />);
    expect(await screen.findByText(texts.book.noSlots)).toBeTruthy();
    await fireEvent.press(await screen.findByText('Otra barbería'));
    expect(props.onOpenBarbershop).toHaveBeenCalledWith('other');
  });

  it('explains a slot that was just taken, keeping the rest of the selection', async () => {
    api(shopRoutes());
    useBookingDraft.getState().start(SHOP, SERVICE);
    useBookingDraft.getState().setBarber(BARBER);
    // The day the user had chosen (today in the barbershop zone, inside the horizon).
    useBookingDraft.getState().setDate(upcomingDays('America/Lima', 1)[0]!.date);
    useBookingDraft.getState().slotTaken();
    await renderWithProviders(<BookScreen {...bookProps()} />);
    expect(await screen.findByText(texts.book.slotTaken)).toBeTruthy();
    expect(useBookingDraft.getState().barberId).toBe(BARBER);
  });

  it('limits the days to the horizon the server reports', async () => {
    api(
      shopRoutes({
        'GET /api/v1/barbershops/{id}/availability': apiError(400, 'DATE_OUT_OF_RANGE', [
          { today: '2030-01-07', lastBookableDate: '2000-01-01' },
        ]),
      }),
    );
    await renderWithProviders(<BookScreen {...bookProps()} />);
    await waitFor(() => expect(useBookingDraft.getState().lastBookableDate).toBe('2000-01-01'));
  });
});

/** A complete draft, as the slot picker leaves it. */
function completeDraft() {
  const draft = useBookingDraft.getState();
  draft.start(SHOP, SERVICE);
  draft.setDate('2030-01-07');
  draft.setSlot({ startAt: '2030-01-07T14:00:00.000Z', endAt: '2030-01-07T14:30:00.000Z' });
}

const summaryProps = () => ({
  onCreated: jest.fn(),
  onRequireLogin: jest.fn(),
  onRequireVerification: jest.fn(),
  onSlotTaken: jest.fn(),
  onChangeSlot: jest.fn(),
  onSeeBookings: jest.fn(),
});

describe('SummaryScreen', () => {
  it('shows the selection with the service price and explains the total comes later', async () => {
    api(shopRoutes());
    completeDraft();
    await renderWithProviders(<SummaryScreen {...summaryProps()} />);
    expect(await screen.findByText('Barbería Demo Miraflores')).toBeTruthy();
    expect(screen.getByText(texts.summary.firstAvailable)).toBeTruthy();
    expect(screen.getByText(/lunes, 7 de enero de 2030 · 09:00/)).toBeTruthy();
    expect(screen.getByText(texts.summary.servicePrice)).toBeTruthy();
    expect(screen.getByText(texts.summary.priceNote)).toBeTruthy();
  });

  it('asks for an account only when confirming, keeping the selection', async () => {
    const calls = api(shopRoutes());
    completeDraft();
    const props = summaryProps();
    await renderWithProviders(<SummaryScreen {...props} />);
    expect(await screen.findByText(texts.summary.loginNote)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: texts.summary.confirm }));
    expect(props.onRequireLogin).toHaveBeenCalled();
    expect(calls.callsTo('POST', '/api/v1/bookings')).toHaveLength(0);
    expect(useBookingDraft.getState().slot).not.toBeNull();
  });

  it('sends unverified accounts to verify their email first', async () => {
    signIn({ emailVerified: false });
    api(shopRoutes());
    completeDraft();
    const props = summaryProps();
    await renderWithProviders(<SummaryScreen {...props} />);
    await fireEvent.press(await screen.findByRole('button', { name: texts.summary.confirm }));
    expect(props.onRequireVerification).toHaveBeenCalled();
  });

  it('creates the booking with an Idempotency-Key and opens it', async () => {
    signIn();
    const calls = api(shopRoutes({ 'POST /api/v1/bookings': { status: 201, body: createdBooking() } }));
    completeDraft();
    const props = summaryProps();
    await renderWithProviders(<SummaryScreen {...props} />);
    await fireEvent.press(await screen.findByRole('button', { name: texts.summary.confirm }));
    await waitFor(() => expect(props.onCreated).toHaveBeenCalledWith('bk-1'));
    const post = calls.callsTo('POST', '/api/v1/bookings')[0]!;
    expect(post.headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/i);
    expect(post.body).toEqual({
      barbershopId: SHOP,
      serviceId: SERVICE,
      startAt: '2030-01-07T14:00:00.000Z',
    });
    expect(useBookingDraft.getState().slot).toBeNull(); // draft cleared after success
  });

  it('reuses the same key when the user retries after a network failure', async () => {
    signIn();
    let attempt = 0;
    const calls = api(
      shopRoutes({
        'POST /api/v1/bookings': () => {
          attempt++;
          return attempt === 1 ? apiError(500, 'INTERNAL_ERROR') : { status: 200, body: createdBooking() };
        },
      }),
    );
    completeDraft();
    const props = summaryProps();
    await renderWithProviders(<SummaryScreen {...props} />);
    await fireEvent.press(await screen.findByRole('button', { name: texts.summary.confirm }));
    expect(await screen.findByText(/req-test/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: texts.summary.confirm }));
    await waitFor(() => expect(props.onCreated).toHaveBeenCalled());
    const keys = calls.callsTo('POST', '/api/v1/bookings').map((c) => c.headers.get('Idempotency-Key'));
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });

  it('goes back to the slots when the slot was taken', async () => {
    signIn();
    api(shopRoutes({ 'POST /api/v1/bookings': apiError(409, 'SLOT_NOT_AVAILABLE') }));
    completeDraft();
    const props = summaryProps();
    await renderWithProviders(<SummaryScreen {...props} />);
    await fireEvent.press(await screen.findByRole('button', { name: texts.summary.confirm }));
    await waitFor(() => expect(props.onSlotTaken).toHaveBeenCalled());
    expect(useBookingDraft.getState()).toMatchObject({
      serviceId: SERVICE,
      date: '2030-01-07',
      slot: null,
      notice: 'slotTaken',
    });
  });

  it('explains the pending bookings limit and offers to see them', async () => {
    signIn();
    const calls = api(shopRoutes({ 'POST /api/v1/bookings': apiError(409, 'TOO_MANY_PENDING_BOOKINGS') }));
    completeDraft();
    const props = summaryProps();
    await renderWithProviders(<SummaryScreen {...props} />);
    await fireEvent.press(await screen.findByRole('button', { name: texts.summary.confirm }));
    expect(await screen.findByText(errors.codes.TOO_MANY_PENDING_BOOKINGS)).toBeTruthy();
    await fireEvent.press(screen.getByText(texts.summary.seeBookings));
    expect(props.onSeeBookings).toHaveBeenCalled();
    // A definitive error ends the attempt: the next "Confirmar" is a new attempt with a new key.
    await fireEvent.press(screen.getByRole('button', { name: texts.summary.confirm }));
    await waitFor(() => expect(calls.callsTo('POST', '/api/v1/bookings')).toHaveLength(2));
    const keys = calls.callsTo('POST', '/api/v1/bookings').map((c) => c.headers.get('Idempotency-Key'));
    expect(keys[0]).not.toBe(keys[1]);
  });

  it('blocks double taps while sending', async () => {
    signIn();
    let resolve!: () => void;
    const calls = api(
      shopRoutes({
        'POST /api/v1/bookings': () =>
          new Promise((r) => {
            resolve = () => r({ status: 201, body: createdBooking() });
          }),
      }),
    );
    completeDraft();
    await renderWithProviders(<SummaryScreen {...summaryProps()} />);
    const button = await screen.findByRole('button', { name: texts.summary.confirm });
    await fireEvent.press(button);
    await fireEvent.press(button);
    expect(screen.getByRole('button', { name: texts.summary.confirm })).toBeDisabled();
    await act(async () => resolve());
    expect(calls.callsTo('POST', '/api/v1/bookings')).toHaveLength(1);
  });

  it('says what is missing when the draft is incomplete', async () => {
    const props = summaryProps();
    await renderWithProviders(<SummaryScreen {...props} />);
    await fireEvent.press(screen.getByText(texts.summary.back));
    expect(props.onChangeSlot).toHaveBeenCalled();
  });
});

const detailRoutes = (overrides: Record<string, unknown> = {}) => ({
  'GET /api/v1/bookings/{id}': { body: booking() },
  'GET /api/v1/bookings/{id}/cancellation-preview': {
    body: cancellationPreview({
      refund: {
        amount: { amount: 0, currency: 'PEN' },
        percent: 0,
        rule: 'NO_PAYMENT',
        paid: { amount: 0, currency: 'PEN' },
      },
    }),
  },
  'GET /api/v1/barbershops/{id}': { body: barbershop() },
  ...overrides,
});
const detailProps = () => ({
  id: 'bk-1',
  onBack: jest.fn(),
  onBookAgain: jest.fn(),
  onOpenBarbershop: jest.fn(),
});

describe('BookingScreen', () => {
  it('shows a pending booking: countdown, price from the API, pay coming soon and the dev id', async () => {
    signIn();
    api(detailRoutes());
    await renderWithProviders(<BookingScreen {...detailProps()} />);
    expect(await screen.findByText(texts.status.PENDING_PAYMENT)).toBeTruthy();
    expect((await screen.findByTestId('pending-countdown')).props.children).toMatch(
      /Tienes \d+:\d{2} para pagar/,
    );
    expect(screen.getByText(texts.detail.pendingExplain)).toBeTruthy();
    expect(screen.getByRole('button', { name: texts.detail.pay })).toBeDisabled();
    expect(screen.getByTestId('booking-total').props.children).toMatch(/25[.,]00/);
    expect(screen.getByText(/lunes, 7 de enero de 2030 · 09:00/)).toBeTruthy();
    expect(screen.getByTestId('dev-booking-id')).toBeTruthy();
    expect(screen.getByText('bk-1')).toBeTruthy();
  });

  it('asks the server again when the payment time is over, instead of deciding itself', async () => {
    signIn();
    let reads = 0;
    api(
      detailRoutes({
        'GET /api/v1/bookings/{id}': () => {
          reads++;
          return reads === 1
            ? { body: booking({ expiresAt: new Date(Date.now() + 1500).toISOString() }) }
            : { body: booking({ status: 'EXPIRED', expiresAt: null }) };
        },
      }),
    );
    const props = detailProps();
    await renderWithProviders(<BookingScreen {...props} />);
    expect(await screen.findByText(texts.status.PENDING_PAYMENT)).toBeTruthy();
    expect(await screen.findByText(texts.detail.expiredTitle, {}, { timeout: 5000 })).toBeTruthy();
    await fireEvent.press(screen.getByText(texts.detail.bookAgain));
    expect(props.onBookAgain).toHaveBeenCalledWith(SHOP);
  });

  it('shows the refund before cancelling and updates the detail and the lists after', async () => {
    signIn();
    let status: 'CONFIRMED' | 'CANCELLED' = 'CONFIRMED';
    api(
      detailRoutes({
        'GET /api/v1/bookings/{id}': () => ({
          body: booking({
            status,
            expiresAt: null,
            cancellation: status === 'CANCELLED' ? { byRole: 'CLIENT', reason: null } : null,
          }),
        }),
        'GET /api/v1/bookings/{id}/cancellation-preview': () => ({
          body:
            status === 'CONFIRMED'
              ? cancellationPreview()
              : cancellationPreview({ allowed: false, reason: 'ALREADY_CANCELLED' }),
        }),
        'POST /api/v1/bookings/{id}/cancel': () => {
          status = 'CANCELLED';
          return {
            body: {
              ...booking({
                status: 'CANCELLED',
                expiresAt: null,
                cancellation: { byRole: 'CLIENT', reason: null },
              }),
              refund: cancellationPreview().refund,
            },
          };
        },
        'GET /api/v1/bookings/{id}/payment': { body: { items: [] } },
      }),
    );
    queryClient.setQueryData(['bookings', 'list', 'upcoming'], { pages: [], pageParams: [] });
    await renderWithProviders(<BookingScreen {...detailProps()} />);
    await fireEvent.press(await screen.findByText(texts.cancel.action));
    expect(await screen.findByText(/Se te devolverá S\/\s?25[.,]00 \(100 %\)\./)).toBeTruthy();
    expect(screen.getByText(new RegExp(texts.cancel.rules.CLIENT_FULL))).toBeTruthy();
    await fireEvent.press(screen.getByText(texts.cancel.confirm));
    expect(await screen.findByText(/Reserva cancelada\. Se te devolverá/)).toBeTruthy();
    expect(screen.getByText(texts.status.CANCELLED)).toBeTruthy();
    expect(screen.getByText(texts.detail.cancelledBy.CLIENT)).toBeTruthy();
    // The cancel button disappears because the API now says it is not allowed.
    await waitFor(() => expect(screen.queryByText(texts.cancel.action)).toBeNull());
    expect(queryClient.getQueryState(['bookings', 'list', 'upcoming'])?.isInvalidated).toBe(true);
  });

  it('shows "not found" for a booking that is not visible', async () => {
    signIn();
    api({ 'GET /api/v1/bookings/{id}': apiError(404, 'NOT_FOUND') });
    const props = detailProps();
    await renderWithProviders(<BookingScreen {...props} />);
    await fireEvent.press(await screen.findByText(common.actions.back));
    expect(props.onBack).toHaveBeenCalled();
  });
});

describe('MyBookingsScreen', () => {
  it('lists upcoming bookings with times in the barbershop zone and switches to history', async () => {
    signIn();
    const calls = api({
      'GET /api/v1/me/bookings': (request: Request) =>
        new URL(request.url).searchParams.get('scope') === 'history'
          ? { body: page([]) }
          : { body: page([booking({ status: 'CONFIRMED' })]) },
      'GET /api/v1/barbershops/{id}': { body: barbershop() },
    });
    const onOpen = jest.fn();
    await renderWithProviders(<MyBookingsScreen onOpenBooking={onOpen} onExplore={jest.fn()} />);
    expect(await screen.findByText(/09:00/)).toBeTruthy();
    expect(screen.getByText(texts.status.CONFIRMED)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('booking-bk-1'));
    expect(onOpen).toHaveBeenCalledWith('bk-1');
    await fireEvent.press(screen.getByRole('radio', { name: texts.list.history }));
    expect(await screen.findByText(texts.list.emptyHistory.title)).toBeTruthy();
    expect(
      calls.fetchMock.mock.calls.some(([r]) => new URL(r.url).searchParams.get('scope') === 'history'),
    ).toBe(true);
  });

  it('shows the error state', async () => {
    signIn();
    api({ 'GET /api/v1/me/bookings': apiError(500, 'INTERNAL_ERROR') });
    await renderWithProviders(<MyBookingsScreen onOpenBooking={jest.fn()} onExplore={jest.fn()} />);
    expect(await screen.findByText(common.actions.retry)).toBeTruthy();
  });
});

describe('booking category', () => {
  it('takes the category of the booked service from the barbershop services', async () => {
    signIn();
    api({ 'GET /api/v1/barbershops/{id}/services': { body: page([service()]) } });
    const { useBookingCategory } = jest.requireActual('../hooks/useBooking');
    const { renderHookWithProviders } = jest.requireActual('@test/render');
    const { result } = await renderHookWithProviders(() => useBookingCategory(SHOP, SERVICE));
    await waitFor(() => expect(result.current).toBe('haircut'));
    const missing = await renderHookWithProviders(() => useBookingCategory(SHOP, 'deleted-service'));
    await waitFor(() => expect(missing.result.current).toBeNull());
  });
});
