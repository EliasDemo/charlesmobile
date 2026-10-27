import { fireEvent, screen } from '@testing-library/react-native';
import { apiError, mockApi } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import texts from '@/shared/i18n/locales/es/business.json';
import { InsightsSection } from '../components/Insights';

beforeEach(() => {
  resetAppState();
  signIn({ roles: ['CLIENT'] });
});

const month = (m: string, total: number) => ({
  month: m,
  totalAmount: total,
  appAmount: total,
  localAmount: 0,
  count: 10,
  averageTicket: 2000,
  growthPct: 10,
  newClients: 3,
  returningClients: 7,
});

it('draws the months and shows the chosen one; the heat map asks for a better plan without it', async () => {
  mockApi({
    'GET /api/v1/barbershops/{id}/reports/monthly': {
      body: {
        months: [month('2030-01', 100000), month('2030-02', 150000)],
        bestMonth: '2030-02',
        worstMonth: '2030-01',
        monthlyAverage: 125000,
        yearOverYearPct: null,
        serviceTrends: [],
      },
    },
    'GET /api/v1/barbershops/{id}/reports/heatmap': apiError(403, 'PLAN_FEATURE_NOT_INCLUDED'),
  } as never);
  const onUpgrade = jest.fn();
  await renderWithProviders(<InsightsSection shopId="shop-1" onUpgrade={onUpgrade} />);
  expect(await screen.findByText(/Promedio mensual/)).toBeTruthy();
  await fireEvent.press(screen.getByText(texts.insights.heatmap));
  await fireEvent.press(await screen.findByText(texts.insights.upgrade));
  expect(onUpgrade).toHaveBeenCalled();
});
