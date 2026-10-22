import { screen } from '@testing-library/react-native';
import { mockApi } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import type { components } from '@/shared/api';
import texts from '@/shared/i18n/locales/es/shop.json';
import { ReadinessCard } from '../components/ReadinessCard';
import { TIME_OPTIONS, withBreak } from '../hooks/useWeekSchedule';

type S = components['schemas'];

describe('schedule helpers', () => {
  it('offers the times of the day every 30 minutes', () => {
    expect(TIME_OPTIONS).toHaveLength(48);
    expect(TIME_OPTIONS[0]).toBe('00:00');
    expect(TIME_OPTIONS[19]).toBe('09:30');
  });

  it('splits a day with a lunch break', () => {
    expect(withBreak([{ start: '09:00', end: '19:00' }])).toEqual([
      { start: '09:00', end: '13:00' },
      { start: '14:00', end: '19:00' },
    ]);
    // A window that does not cover the break stays as it is.
    expect(withBreak([{ start: '15:00', end: '19:00' }])).toEqual([{ start: '15:00', end: '19:00' }]);
  });
});

const shop = (status: S['BarbershopManageDto']['status'] = 'OPEN') =>
  ({ id: 'shop-1', status }) as S['BarbershopManageDto'];

const barber = (overrides: Partial<S['BarberManageDto']>) =>
  ({
    id: 'b1',
    displayName: 'Julián',
    isActive: true,
    serviceIds: ['sv1'],
    ...overrides,
  }) as S['BarberManageDto'];

const routes = (barbers: S['BarberManageDto'][], days: S['DayScheduleDto'][]) => ({
  'GET /api/v1/barbershops/{id}/business-hours': {
    body: { timezone: 'America/Lima', isOpenNow: true, days },
  },
  'GET /api/v1/me/barbershops/{id}/services': {
    body: { items: [{ id: 'sv1', isAvailable: true }], nextCursor: null },
  },
  'GET /api/v1/me/barbershops/{id}/barbers': { body: { items: barbers, nextCursor: null } },
});

beforeEach(() => {
  resetAppState();
  signIn({ roles: ['CLIENT', 'OWNER'] });
});

describe('ReadinessCard', () => {
  it('names the barbers without services and the missing hours', async () => {
    mockApi(routes([barber({ serviceIds: [] })], []) as never);
    await renderWithProviders(<ReadinessCard shop={shop()} onFix={jest.fn()} />);
    expect(await screen.findByText(texts.readiness.missing.hours)).toBeTruthy();
    expect(screen.getByText(/Sin servicios asignados: Julián/)).toBeTruthy();
    expect(screen.getByText(texts.readiness.ok.published)).toBeTruthy();
  });

  it('hides itself when clients can book', async () => {
    const api = mockApi(
      routes([barber({})], [{ dayOfWeek: 1, windows: [{ start: '09:00', end: '18:00' }] }]) as never,
    );
    await renderWithProviders(<ReadinessCard shop={shop()} onFix={jest.fn()} />);
    await new Promise((r) => setTimeout(r, 50));
    expect(api.fetchMock).toHaveBeenCalled();
    expect(screen.queryByTestId('readiness-card')).toBeNull();
  });
});
