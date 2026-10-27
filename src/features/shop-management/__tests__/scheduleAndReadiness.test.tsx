import { fireEvent, screen } from '@testing-library/react-native';
import { mockApi } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import texts from '@/shared/i18n/locales/es/shop.json';
import { ReadinessCard } from '../components/ReadinessCard';
import { TIME_OPTIONS, withBreak } from '../hooks/useWeekSchedule';

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

beforeEach(() => {
  resetAppState();
  signIn({ roles: ['CLIENT', 'OWNER'] });
});

describe('ReadinessCard', () => {
  it("shows the backend's messages, blocking first, and opens where each is fixed", async () => {
    mockApi({
      'GET /api/v1/barbershops/{id}/readiness': {
        body: {
          ready: false,
          bookableBarbers: 0,
          issues: [
            {
              code: 'INVITATION_PENDING',
              severity: 'WARNING',
              message: 'Julián aún no acepta',
              barberId: 'b1',
              barberName: 'Julián',
            },
            {
              code: 'NO_BUSINESS_HOURS',
              severity: 'BLOCKING',
              message: 'Falta el horario',
              barberId: null,
              barberName: null,
            },
          ],
        },
      },
    } as never);
    const onFix = jest.fn();
    await renderWithProviders(<ReadinessCard shopId="shop-1" onFix={onFix} />);
    expect(await screen.findByText('Falta el horario')).toBeTruthy();
    expect(screen.getByText('Julián aún no acepta')).toBeTruthy();
    await fireEvent.press(screen.getByText(texts.readiness.fixTarget.hours));
    expect(onFix).toHaveBeenCalledWith('hours');
  });

  it('hides itself when there is nothing to say', async () => {
    const api = mockApi({
      'GET /api/v1/barbershops/{id}/readiness': { body: { ready: true, bookableBarbers: 2, issues: [] } },
    } as never);
    await renderWithProviders(<ReadinessCard shopId="shop-1" onFix={jest.fn()} />);
    await new Promise((r) => setTimeout(r, 50));
    expect(api.fetchMock).toHaveBeenCalled();
    expect(screen.queryByTestId('readiness-card')).toBeNull();
  });
});
