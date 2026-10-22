import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { apiError, mockApi, page, service } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import type { components } from '@/shared/api';
import texts from '@/shared/i18n/locales/es/business.json';
import { CashScreen, ClientsScreen, NewSaleScreen, ReportsScreen, SaleScreen } from '..';

type S = components['schemas'];
const SHOP = 'shop-1';

const sale = (overrides: Partial<S['SaleDto']> = {}) =>
  ({
    id: 'sale-1',
    shopClientId: null,
    clientName: null,
    barberId: null,
    barberName: null,
    lines: [
      { serviceId: 'sv1', description: 'Corte clásico', quantity: 1, unitAmount: 2500, totalAmount: 2500 },
    ],
    subtotalAmount: 2500,
    discountAmount: 0,
    totalAmount: 2500,
    currency: 'PEN',
    paymentMethod: 'CASH',
    status: 'COMPLETED',
    voidReason: null,
    invoice: null,
    soldAt: '2030-01-07T15:00:00.000Z',
    ...overrides,
  }) as S['SaleDto'];

const shopRoutes = {
  'GET /api/v1/barbershops/{id}/services': { body: page([service({ id: 'sv1' })]) },
  'GET /api/v1/me/barbershops/{id}/barbers': { body: page([]) },
  'GET /api/v1/barbershops/{id}/clients': { body: [] },
};

beforeEach(() => {
  resetAppState();
  signIn({ roles: ['CLIENT', 'OWNER'] });
});

describe('CashScreen', () => {
  it('opens a closed register with the starting money in céntimos', async () => {
    const api = mockApi({
      'GET /api/v1/barbershops/{id}/cash': apiError(404, 'NOT_FOUND'),
      'GET /api/v1/barbershops/{id}/cash/history': { body: [] },
      'POST /api/v1/barbershops/{id}/cash/open': {
        status: 201,
        body: {
          id: 'c1',
          openedAt: '2030-01-07T13:00:00.000Z',
          openingAmount: 5000,
          salesCount: 0,
          salesTotal: 0,
        },
      },
    });
    await renderWithProviders(<CashScreen shopId={SHOP} onNewSale={jest.fn()} />);
    await fireEvent.changeText(await screen.findByLabelText(texts.cash.openingAmount), '50');
    await fireEvent.press(screen.getByRole('button', { name: texts.cash.open }));
    await waitFor(() =>
      expect(api.calls.find((c) => c.method === 'POST')!.body).toEqual({ openingAmount: 5000 }),
    );
  });
});

describe('NewSaleScreen', () => {
  it('sends the chosen service and method, and offers to open the register for cash', async () => {
    const api = mockApi({
      ...shopRoutes,
      'POST /api/v1/barbershops/{id}/sales': apiError(409, 'CASH_SESSION_REQUIRED'),
    });
    const onOpenCash = jest.fn();
    await renderWithProviders(<NewSaleScreen shopId={SHOP} onDone={jest.fn()} onOpenCash={onOpenCash} />);
    await fireEvent.press(await screen.findByText(/Corte clásico/));
    await fireEvent.press(screen.getByRole('button', { name: texts.sale.register }));
    expect(await screen.findByText(texts.sale.needsCash)).toBeTruthy();
    const post = api.calls.find((c) => c.method === 'POST')!;
    expect(post.body).toEqual({
      lines: [{ serviceId: 'sv1', quantity: 1 }],
      paymentMethod: 'CASH',
      discountAmount: 0,
      issueInvoice: false,
    });
    expect(post.headers.get('Idempotency-Key')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: texts.cash.open }));
    expect(onOpenCash).toHaveBeenCalled();
  });
});

describe('SaleScreen', () => {
  it('voids a sale with a reason', async () => {
    const api = mockApi({
      'GET /api/v1/barbershops/{id}/sales/{saleId}': { body: sale() },
      'POST /api/v1/barbershops/{id}/sales/{saleId}/void': {
        body: sale({ status: 'VOIDED', voidReason: 'Error' }),
      },
    });
    await renderWithProviders(<SaleScreen shopId={SHOP} saleId="sale-1" />);
    await fireEvent.press(await screen.findByRole('button', { name: texts.sales.void }));
    await fireEvent.changeText(screen.getByLabelText(texts.sales.voidReason), 'Cobro duplicado');
    const buttons = screen.getAllByRole('button', { name: texts.sales.void });
    await fireEvent.press(buttons[buttons.length - 1]!);
    await waitFor(() =>
      expect(api.calls.find((c) => c.method === 'POST')!.body).toEqual({ reason: 'Cobro duplicado' }),
    );
  });
});

describe('ClientsScreen', () => {
  it('shows the tiers and the clients', async () => {
    mockApi({
      'GET /api/v1/barbershops/{id}/clients/ranking': {
        body: { tiers: [{ tier: 'GOLD', count: 3, minScore: 80 }], top: [], windowDays: 180, rankedAt: null },
      },
      'GET /api/v1/barbershops/{id}/clients': {
        body: [
          {
            id: 'cl1',
            displayName: 'Ana',
            username: 'ana.perez',
            phone: null,
            notes: null,
            preferences: null,
            isRegular: true,
            tier: 'GOLD',
            score: 90,
            visitsCount: 12,
            totalSpent: 30000,
            firstVisitAt: null,
            lastVisitAt: null,
            createdAt: '2030-01-01T00:00:00.000Z',
          },
        ],
      },
    });
    await renderWithProviders(<ClientsScreen shopId={SHOP} onOpen={jest.fn()} />);
    expect(await screen.findByText('Ana')).toBeTruthy();
    expect(screen.getByText('@ana.perez')).toBeTruthy();
    expect(screen.getAllByText(texts.tiers.GOLD).length).toBeGreaterThan(0);
  });
});

describe('ReportsScreen', () => {
  it('shows what the report sends, and the plan note when it is partial', async () => {
    mockApi({
      'GET /api/v1/barbershops/{id}/reports/sales': {
        body: {
          from: '2030-01-01',
          to: '2030-01-07',
          appAmount: 10000,
          localAmount: 5000,
          totalAmount: 15000,
          count: 6,
          averageTicket: 2500,
          newClients: 2,
          returningClients: 4,
          byDay: [],
          byBarber: [],
          byService: [],
          byMethod: [],
          full: false,
        },
      },
    });
    await renderWithProviders(<ReportsScreen shopId={SHOP} />);
    expect(await screen.findByText(texts.reports.partial)).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
  });
});
