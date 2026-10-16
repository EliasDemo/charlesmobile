import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { apiError, barbershop, mockApi, page, service } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import type { components } from '@/shared/api';
import texts from '@/shared/i18n/locales/es/promotions.json';
import { ActivePromotions, NewPromotionScreen, PromotionScreen, PromotionsScreen } from '..';

type S = components['schemas'];
const SHOP = 'shop-1';

const promotion = (overrides: Partial<S['PromotionDto']> = {}): S['PromotionDto'] => ({
  id: 'p1',
  scope: 'BARBERSHOP',
  barbershopId: SHOP,
  serviceId: null,
  name: '20 % los martes',
  type: 'PERCENTAGE',
  value: 20,
  currency: null,
  startsAt: '2030-01-01T05:00:00.000Z',
  endsAt: null,
  maxRedemptions: 50,
  maxPerUser: null,
  daysOfWeek: [2],
  requiresCoupon: false,
  isActive: true,
  status: 'ACTIVE',
  redemptions: 3,
  discountedTotal: { amount: 1500, currency: 'PEN' },
  coupons: [],
  createdAt: '2030-01-01T05:00:00.000Z',
  ...overrides,
});

const shopRoutes = {
  'GET /api/v1/barbershops/{id}': { body: barbershop() },
  'GET /api/v1/barbershops/{id}/services': { body: page([service()]) },
};

beforeEach(() => {
  resetAppState();
  signIn({ roles: ['CLIENT', 'OWNER'] });
});

describe('ActivePromotions', () => {
  it('shows the automatic promotions with their value and days', async () => {
    mockApi({
      ...shopRoutes,
      'GET /api/v1/barbershops/{id}/promotions/active': {
        body: [
          {
            id: 'a1',
            name: 'Martes de corte',
            type: 'PERCENTAGE',
            value: 20,
            currency: null,
            serviceId: null,
            daysOfWeek: [2, 4],
            endsAt: null,
            fromCharles: true,
          },
        ],
      },
    });
    await renderWithProviders(<ActivePromotions barbershopId={SHOP} timeZone="America/Lima" />);
    expect(await screen.findByText('Martes de corte')).toBeTruthy();
    expect(screen.getByText('20 %')).toBeTruthy();
    expect(screen.getByText('Martes y jueves')).toBeTruthy();
    expect(screen.getByText(texts.fromCharles)).toBeTruthy();
  });

  it('shows nothing when there are none', async () => {
    mockApi({ ...shopRoutes, 'GET /api/v1/barbershops/{id}/promotions/active': { body: [] } });
    await renderWithProviders(<ActivePromotions barbershopId={SHOP} timeZone="America/Lima" />);
    await waitFor(() => expect(screen.queryByTestId('active-promotions')).toBeNull());
  });
});

describe('PromotionsScreen', () => {
  it('lists promotions with their state and uses', async () => {
    mockApi({ ...shopRoutes, 'GET /api/v1/barbershops/{id}/promotions': { body: [promotion()] } });
    await renderWithProviders(<PromotionsScreen shopId={SHOP} onNew={jest.fn()} onOpen={jest.fn()} />);
    expect(await screen.findByText('20 % los martes')).toBeTruthy();
    expect(screen.getByText(texts.status.ACTIVE)).toBeTruthy();
    expect(screen.getByText('3 de 50 canjes')).toBeTruthy();
  });

  it('explains the empty state', async () => {
    mockApi({ ...shopRoutes, 'GET /api/v1/barbershops/{id}/promotions': { body: [] } });
    await renderWithProviders(<PromotionsScreen shopId={SHOP} onNew={jest.fn()} onOpen={jest.fn()} />);
    expect(await screen.findByText(texts.empty)).toBeTruthy();
  });
});

describe('NewPromotionScreen', () => {
  it('sends a fixed amount in céntimos, with the chosen days', async () => {
    const api = mockApi({
      ...shopRoutes,
      'POST /api/v1/barbershops/{id}/promotions': { status: 201, body: promotion() },
    });
    const onCreated = jest.fn();
    await renderWithProviders(<NewPromotionScreen shopId={SHOP} onCreated={onCreated} />);
    await fireEvent.changeText(await screen.findByLabelText(texts.form.name), 'Cinco soles menos');
    await fireEvent.press(screen.getByText(texts.form.fixed));
    await fireEvent.changeText(screen.getByLabelText(texts.form.amountValue), '5');
    await fireEvent.press(screen.getByText('mar'));
    await fireEvent.press(screen.getByRole('button', { name: texts.form.create }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('p1'));
    expect(api.calls.find((c) => c.method === 'POST')!.body).toMatchObject({
      name: 'Cinco soles menos',
      type: 'FIXED_AMOUNT',
      value: 500,
      daysOfWeek: [2],
      requiresCoupon: false,
    });
  });

  it('checks the percentage range next to the field', async () => {
    mockApi(shopRoutes);
    await renderWithProviders(<NewPromotionScreen shopId={SHOP} onCreated={jest.fn()} />);
    await fireEvent.changeText(await screen.findByLabelText(texts.form.name), 'Mucho descuento');
    await fireEvent.changeText(screen.getByLabelText(texts.form.percentValue), '150');
    await fireEvent.press(screen.getByRole('button', { name: texts.form.create }));
    expect(await screen.findByText(texts.form.percentRange)).toBeTruthy();
  });
});

describe('PromotionScreen', () => {
  it('pauses a promotion and explains a code that already exists', async () => {
    const api = mockApi({
      ...shopRoutes,
      'GET /api/v1/barbershops/{id}/promotions': { body: [promotion({ requiresCoupon: true })] },
      'PATCH /api/v1/barbershops/{id}/promotions/{promotionId}': { body: promotion({ status: 'PAUSED' }) },
      'POST /api/v1/barbershops/{id}/promotions/{promotionId}/coupons': apiError(409, 'COUPON_CODE_TAKEN'),
    });
    await renderWithProviders(<PromotionScreen shopId={SHOP} promotionId="p1" />);
    await fireEvent.press(await screen.findByRole('button', { name: texts.pause }));
    await waitFor(() =>
      expect(api.calls.find((c) => c.method === 'PATCH')!.body).toEqual({ isActive: false }),
    );
    await fireEvent.changeText(screen.getByLabelText(texts.coupons.code), 'HOLA10');
    await fireEvent.press(screen.getByRole('button', { name: texts.coupons.add }));
    expect(await screen.findByText(texts.coupons.taken)).toBeTruthy();
  });
});
