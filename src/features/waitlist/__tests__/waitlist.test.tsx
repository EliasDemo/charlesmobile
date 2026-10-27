import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { apiError, mockApi } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import common from '@/shared/i18n/locales/es/common.json';
import texts from '@/shared/i18n/locales/es/waitlist.json';
import { MyWaitlistScreen, WaitlistButton } from '..';

const SHOP = '11111111-1111-4111-8111-111111111111';
const SERVICE = '22222222-2222-4222-8222-222222222222';
const BARBER = '33333333-3333-4333-8333-333333333333';

const entry = (over: Record<string, unknown> = {}) => ({
  id: 'e1',
  barbershopId: SHOP,
  barbershopName: 'Barbería Demo Miraflores',
  serviceId: SERVICE,
  serviceName: 'Corte clásico',
  barberId: null,
  barberName: null,
  date: '2030-01-07',
  fromMinute: 540,
  toMinute: 720,
  status: 'ACTIVE',
  notifiedAt: null,
  createdAt: '2030-01-01T10:00:00.000Z',
  ...over,
});

/** Recorded calls keep the real path (with the id), not the contract template. */ const joins = (
  api: ReturnType<typeof mockApi>,
) => api.calls.filter((c) => c.method === 'POST' && c.path === `/api/v1/barbershops/${SHOP}/waitlist`);
beforeEach(() => {
  resetAppState();
  signIn();
});

const buttonProps = (over: Partial<Parameters<typeof WaitlistButton>[0]> = {}) => ({
  barbershopId: SHOP,
  serviceId: SERVICE,
  date: '2030-01-07',
  barber: { id: BARBER, name: 'Barbero Demo' },
  onRequireLogin: jest.fn(),
  ...over,
});

describe('WaitlistButton', () => {
  it('joins for the afternoon with the chosen barber, sending minutes of the local day', async () => {
    const api = mockApi({ 'POST /api/v1/barbershops/{id}/waitlist': { status: 201, body: entry() } });
    await renderWithProviders(<WaitlistButton {...buttonProps()} />);
    await fireEvent.press(screen.getByTestId('waitlist-open'));
    await fireEvent.press(screen.getByText(texts.windows.afternoon));
    await fireEvent.press(screen.getByText(texts.sheet.confirm));
    await waitFor(() => expect(joins(api)).toHaveLength(1));
    expect(joins(api)[0]!.body).toEqual({
      serviceId: SERVICE,
      date: '2030-01-07',
      barberId: BARBER,
      fromMinute: 720,
      toMinute: 1080,
    });
  });

  it('can take any barber and any time (no range, no barber)', async () => {
    const api = mockApi({ 'POST /api/v1/barbershops/{id}/waitlist': { status: 201, body: entry() } });
    await renderWithProviders(<WaitlistButton {...buttonProps()} />);
    await fireEvent.press(screen.getByTestId('waitlist-open'));
    await fireEvent.press(screen.getByText(texts.sheet.anyBarber));
    await fireEvent.press(screen.getByText(texts.sheet.confirm));
    await waitFor(() => expect(joins(api)).toHaveLength(1));
    expect(joins(api)[0]!.body).toEqual({
      serviceId: SERVICE,
      date: '2030-01-07',
    });
  });

  it('explains the limit of 5 active lists', async () => {
    mockApi({ 'POST /api/v1/barbershops/{id}/waitlist': apiError(409, 'CONFLICT') });
    await renderWithProviders(<WaitlistButton {...buttonProps()} />);
    await fireEvent.press(screen.getByTestId('waitlist-open'));
    await fireEvent.press(screen.getByText(texts.sheet.confirm));
    expect(await screen.findByText(texts.errors.limit)).toBeTruthy();
  });

  it('asks for an account without a session', async () => {
    resetAppState();
    const props = buttonProps();
    await renderWithProviders(<WaitlistButton {...props} />);
    await fireEvent.press(screen.getByTestId('waitlist-open'));
    expect(props.onRequireLogin).toHaveBeenCalled();
  });
});

describe('MyWaitlistScreen', () => {
  it('loading', async () => {
    globalThis.fetch = jest.fn(() => new Promise<Response>(() => undefined)) as unknown as typeof fetch;
    await renderWithProviders(<MyWaitlistScreen onBook={jest.fn()} />);
    expect(screen.getByTestId('loading-state')).toBeTruthy();
  });

  it('empty (ended lists are not shown)', async () => {
    mockApi({ 'GET /api/v1/me/waitlist': { body: [entry({ status: 'EXPIRED' })] } });
    await renderWithProviders(<MyWaitlistScreen onBook={jest.fn()} />);
    expect(await screen.findByText(texts.empty.title)).toBeTruthy();
  });

  it('error with retry', async () => {
    mockApi({ 'GET /api/v1/me/waitlist': apiError(500, 'INTERNAL_ERROR') });
    await renderWithProviders(<MyWaitlistScreen onBook={jest.fn()} />);
    expect(await screen.findByText(common.actions.retry)).toBeTruthy();
  });

  it('offers to book a freed slot and to leave a list after confirming', async () => {
    let left = false;
    const api = mockApi({
      'GET /api/v1/me/waitlist': () => ({
        body: left ? [] : [entry(), entry({ id: 'e2', status: 'NOTIFIED' })],
      }),
      'DELETE /api/v1/me/waitlist/{entryId}': () => {
        left = true;
        return { status: 204 };
      },
    });
    const onBook = jest.fn();
    await renderWithProviders(<MyWaitlistScreen onBook={onBook} />);
    expect(await screen.findByText(texts.status.NOTIFIED)).toBeTruthy();
    expect(screen.getAllByText('09:00–12:00').length).toBe(2);
    await fireEvent.press(screen.getByText(texts.entry.book));
    expect(onBook).toHaveBeenCalledWith(SHOP, SERVICE);

    await fireEvent.press(screen.getAllByText(texts.entry.leave)[0]!);
    await fireEvent.press(screen.getAllByText(texts.entry.leave).at(-1)!);
    await waitFor(() => expect(api.calls.filter((c) => c.method === 'DELETE')).toHaveLength(1));
    expect(await screen.findByText(texts.empty.title)).toBeTruthy();
  });
});
