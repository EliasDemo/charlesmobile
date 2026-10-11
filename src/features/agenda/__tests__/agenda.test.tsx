import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { apiError, barbershop, booking, mockApi } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import type { components } from '@/shared/api';
import texts from '@/shared/i18n/locales/es/agenda.json';
import { AgendaScreen } from '..';

type S = components['schemas'];

const item = (overrides: Partial<S['AgendaItemDto']> = {}): S['AgendaItemDto'] => ({
  bookingId: 'bk-1',
  status: 'CONFIRMED',
  startAt: '2030-01-07T14:00:00.000Z',
  endAt: '2030-01-07T14:30:00.000Z',
  service: { id: 'sv1', name: 'Corte clásico', categoryKey: 'haircut' },
  barber: { id: 'b1', name: 'Barbero Demo' },
  client: { id: 'c1', name: 'Cliente Demo' },
  awaitingPayment: false,
  pendingAttention: false,
  actions: { canMarkAttended: false, canMarkNoShow: false, canCorrect: false, canCancel: false },
  ...overrides,
});

const agenda = (overrides: Partial<S['AgendaDto']> = {}): S['AgendaDto'] => ({
  date: '2030-01-07',
  timezone: 'America/Lima',
  barbershop: { id: 's1', name: 'Barbería Demo Miraflores' },
  items: [],
  blocks: [],
  pendingAttention: 0,
  ...overrides,
});

const managerRoutes = {
  'GET /api/v1/me/barbershops': {
    body: {
      items: [
        { id: 's1', name: 'Barbería Demo Miraflores', myRole: 'OWNER', status: 'OPEN', type: 'BARBERSHOP' },
      ],
      nextCursor: null,
    },
  },
  'GET /api/v1/me/barbershops/{id}': {
    body: {
      ...barbershop(),
      id: 's1',
      ownerDocument: null,
      myRole: 'OWNER',
      createdAt: '2030-01-01T00:00:00.000Z',
    },
  },
  'GET /api/v1/me/barbershops/{id}/barbers': { body: { items: [], nextCursor: null } },
} as const;

beforeEach(() => {
  resetAppState();
  signIn({ roles: ['CLIENT', 'OWNER'] });
});

describe('AgendaScreen (manager)', () => {
  it('shows the bookings in the barbershop zone with only the actions the API allows, never cancel', async () => {
    mockApi({
      ...managerRoutes,
      'GET /api/v1/barbershops/{id}/agenda': {
        body: agenda({
          pendingAttention: 1,
          items: [
            item({
              pendingAttention: true,
              actions: { canMarkAttended: true, canMarkNoShow: true, canCorrect: false, canCancel: false },
            }),
            item({
              bookingId: 'bk-2',
              status: 'ATTENDED',
              actions: { canMarkAttended: false, canMarkNoShow: false, canCorrect: true, canCancel: false },
            }),
          ],
        }),
      },
    });
    await renderWithProviders(<AgendaScreen />);
    const first = within(await screen.findByTestId('agenda-item-bk-1'));
    expect(first.getByText('09:00–09:30')).toBeTruthy(); // America/Lima
    expect(first.getByText(texts.status.pendingAttention)).toBeTruthy();
    expect(first.getByRole('button', { name: texts.actions.attended })).toBeTruthy();
    expect(first.getByRole('button', { name: texts.actions.noShow })).toBeTruthy();
    expect(first.queryByRole('button', { name: texts.actions.correct })).toBeNull();
    const second = within(screen.getByTestId('agenda-item-bk-2'));
    expect(second.getByRole('button', { name: texts.actions.correct })).toBeTruthy();
    expect(second.queryByRole('button', { name: texts.actions.attended })).toBeNull();
    expect(screen.getByText(/1 cita ya empezó/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /cancelar/i })).toBeNull();
  });

  it('marks as attended and fetches the agenda again', async () => {
    const api = mockApi({
      ...managerRoutes,
      'GET /api/v1/barbershops/{id}/agenda': {
        body: agenda({
          items: [
            item({
              actions: { canMarkAttended: true, canMarkNoShow: false, canCorrect: false, canCancel: false },
            }),
          ],
        }),
      },
      'POST /api/v1/bookings/{id}/attended': { body: booking({ status: 'ATTENDED' }) },
    });
    await renderWithProviders(<AgendaScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: texts.actions.attended }));
    await waitFor(() =>
      expect(api.calls.some((c) => c.path === '/api/v1/bookings/bk-1/attended')).toBe(true),
    );
    await waitFor(() =>
      expect(api.calls.filter((c) => c.path.endsWith('/agenda')).length).toBeGreaterThanOrEqual(2),
    );
  });

  it('asks before marking a no-show, explaining there is no refund', async () => {
    const api = mockApi({
      ...managerRoutes,
      'GET /api/v1/barbershops/{id}/agenda': {
        body: agenda({
          items: [
            item({
              actions: { canMarkAttended: false, canMarkNoShow: true, canCorrect: false, canCancel: false },
            }),
          ],
        }),
      },
      'POST /api/v1/bookings/{id}/no-show': { body: booking({ status: 'NO_SHOW' }) },
    });
    await renderWithProviders(<AgendaScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: texts.actions.noShow }));
    expect(screen.getByText(/no hay devolución/)).toBeTruthy();
    expect(api.calls.some((c) => c.path.endsWith('/no-show'))).toBe(false);
    await fireEvent.press(screen.getByRole('button', { name: texts.noShowDialog.confirm }));
    await waitFor(() => expect(api.calls.some((c) => c.path === '/api/v1/bookings/bk-1/no-show')).toBe(true));
  });

  it('shows the backend message when the window has passed', async () => {
    mockApi({
      ...managerRoutes,
      'GET /api/v1/barbershops/{id}/agenda': {
        body: agenda({
          items: [
            item({
              actions: { canMarkAttended: true, canMarkNoShow: false, canCorrect: false, canCancel: false },
            }),
          ],
        }),
      },
      'POST /api/v1/bookings/{id}/attended': apiError(409, 'ATTENDANCE_NOT_ALLOWED', [
        { autoCloseHours: 24 },
      ]),
    });
    await renderWithProviders(<AgendaScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: texts.actions.attended }));
    expect(await screen.findByText(/Fuera del plazo para marcar como atendida/)).toBeTruthy();
  });

  it('corrects attended to no-show only with a reason of at least 3 characters', async () => {
    const api = mockApi({
      ...managerRoutes,
      'GET /api/v1/barbershops/{id}/agenda': {
        body: agenda({
          items: [
            item({
              status: 'ATTENDED',
              actions: { canMarkAttended: false, canMarkNoShow: false, canCorrect: true, canCancel: false },
            }),
          ],
        }),
      },
      'POST /api/v1/bookings/{id}/attendance-correction': { body: booking({ status: 'NO_SHOW' }) },
    });
    await renderWithProviders(<AgendaScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: texts.actions.correct }));
    const confirm = screen.getByRole('button', { name: texts.correctionDialog.confirm });
    expect(confirm).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText(texts.correctionDialog.reason), 'ok');
    expect(confirm).toBeDisabled();
    await fireEvent.changeText(
      screen.getByLabelText(texts.correctionDialog.reason),
      '  Se marcó por error  ',
    );
    await fireEvent.press(confirm);
    await waitFor(() =>
      expect(api.calls.find((c) => c.path.endsWith('/attendance-correction'))?.body).toEqual({
        status: 'NO_SHOW',
        reason: 'Se marcó por error',
      }),
    );
  });

  it('cancels only when the API allows it, with a reason, and shows the refund', async () => {
    const api = mockApi({
      ...managerRoutes,
      'GET /api/v1/barbershops/{id}/agenda': {
        body: agenda({
          items: [
            item({
              actions: { canMarkAttended: false, canMarkNoShow: false, canCorrect: false, canCancel: true },
            }),
            item({ bookingId: 'bk-2' }),
          ],
        }),
      },
      'POST /api/v1/bookings/{id}/cancel': {
        body: {
          ...booking({ status: 'CANCELLED' }),
          refund: {
            amount: { amount: 2500, currency: 'PEN' },
            percent: 100,
            rule: 'BARBERSHOP_CANCELLATION',
            paid: { amount: 2500, currency: 'PEN' },
          },
        } as S['CancelledBookingDto'],
      },
    });
    await renderWithProviders(<AgendaScreen />);
    const second = within(await screen.findByTestId('agenda-item-bk-2'));
    expect(second.queryByRole('button', { name: texts.actions.cancel })).toBeNull();
    await fireEvent.press(
      within(screen.getByTestId('agenda-item-bk-1')).getByRole('button', { name: texts.actions.cancel }),
    );
    expect(screen.getByText(/se le devolverá todo lo que pagó/)).toBeTruthy();
    const confirm = screen.getByRole('button', { name: texts.cancelDialog.confirm });
    expect(confirm).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText(texts.cancelDialog.reason), 'Barbero enfermo');
    await fireEvent.press(confirm);
    expect(await screen.findByText(/Se devolverán S\/\s?25[.,]00 al cliente/)).toBeTruthy();
    expect(api.calls.find((c) => c.path === '/api/v1/bookings/bk-1/cancel')?.body).toEqual({
      reason: 'Barbero enfermo',
    });
  });

  it('explains an empty day', async () => {
    mockApi({ ...managerRoutes, 'GET /api/v1/barbershops/{id}/agenda': { body: agenda() } });
    await renderWithProviders(<AgendaScreen />);
    expect(await screen.findByText(texts.empty)).toBeTruthy();
  });

  it('shows an error with retry', async () => {
    mockApi({ ...managerRoutes, 'GET /api/v1/barbershops/{id}/agenda': apiError(500, 'INTERNAL_ERROR') });
    await renderWithProviders(<AgendaScreen />);
    expect(await screen.findByRole('button', { name: /reintentar/i })).toBeTruthy();
  });
});

describe('AgendaScreen (barber)', () => {
  it('uses the barber agenda of the active profile', async () => {
    signIn({ roles: ['CLIENT', 'BARBER'] });
    const api = mockApi({
      'GET /api/v1/me/barbershops': { body: { items: [], nextCursor: null } },
      'GET /api/v1/me/barber': {
        body: {
          items: [
            {
              barberId: 'b1',
              displayName: 'Barbero Demo',
              isActive: true,
              serviceIds: [],
              barbershop: {
                id: 's1',
                name: 'Barbería Demo Miraflores',
                status: 'OPEN',
                timezone: 'America/Lima',
              },
            },
          ],
        },
      },
      'GET /api/v1/me/barber/agenda': { body: agenda({ items: [item()] }) },
    });
    await renderWithProviders(<AgendaScreen />);
    expect(await screen.findByTestId('agenda-item-bk-1')).toBeTruthy();
    expect(api.calls.some((c) => c.path === '/api/v1/me/barber/agenda')).toBe(true);
    expect(screen.queryByText(texts.view.shop)).toBeNull();
  });

  it('explains when the account has no agenda', async () => {
    signIn({ roles: ['CLIENT', 'BARBER'] });
    mockApi({
      'GET /api/v1/me/barbershops': { body: { items: [], nextCursor: null } },
      'GET /api/v1/me/barber': { body: { items: [] } },
    });
    await renderWithProviders(<AgendaScreen />);
    expect(await screen.findByText(texts.noAccess)).toBeTruthy();
  });
});
