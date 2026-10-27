import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { mockApi } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import { ApiError, queryClient, usePlanLimit, type components } from '@/shared/api';
import texts from '@/shared/i18n/locales/es/plans.json';
import { PlanLimitNotice } from '@/shared/ui';
import { MyPlanScreen, PlansScreen, VerifiedBadge } from '..';

type S = components['schemas'];

const plan = (overrides: Partial<S['PlanDto']> = {}): S['PlanDto'] =>
  ({
    id: 'p1',
    code: 'pro',
    name: 'Pro',
    description: null,
    audience: 'BARBERSHOP',
    priceMonthly: 4900,
    priceYearly: 49000,
    currency: 'PEN',
    trialDays: 14,
    commissionBp: 500,
    isDefault: false,
    entitlements: [{ key: 'barbers', kind: 'LIMIT', label: 'Barberos', value: 5 }],
    ...overrides,
  }) as S['PlanDto'];

const shopPlan = (overrides: Partial<S['BarbershopPlanDto']> = {}) =>
  ({
    plan: plan(),
    subscription: {
      id: 's1',
      status: 'PENDING',
      interval: 'MONTHLY',
      plan: plan(),
      priceAmount: 4900,
      currency: 'PEN',
      checkoutUrl: 'https://pay.example/x',
      cancelAtPeriodEnd: false,
      createdAt: '2030-01-01T00:00:00.000Z',
    },
    usage: [
      { key: 'barbers', label: 'Barberos', kind: 'LIMIT', limit: 5, used: 4 },
      { key: 'photos', label: 'Fotos', kind: 'LIMIT', limit: null, used: 30 },
    ],
    suspendedBarbers: 0,
    hiddenPhotos: 0,
    ...overrides,
  }) as S['BarbershopPlanDto'];

beforeEach(() => {
  resetAppState();
  signIn({ roles: ['CLIENT', 'OWNER'] });
});

describe('MyPlanScreen', () => {
  it('shows the usage bars and that the payment link went to the email (no buy button)', async () => {
    mockApi({ 'GET /api/v1/barbershops/{id}/plan': { body: shopPlan() } });
    await renderWithProviders(<MyPlanScreen shopId="shop-1" isOwner onChangePlan={jest.fn()} />);
    expect(await screen.findByText('4 de 5')).toBeTruthy();
    expect(screen.getByText('30 · sin límite')).toBeTruthy();
    expect(screen.getByText(texts.pendingEmail)).toBeTruthy();
    // The app never opens the checkout: it only asks the backend whether it was paid.
    expect(screen.queryByText(/comprar/i)).toBeNull();
  });

  it('asks the backend whether it was paid', async () => {
    const api = mockApi({
      'GET /api/v1/barbershops/{id}/plan': { body: shopPlan() },
      'POST /api/v1/barbershops/{id}/subscription/sync': { body: shopPlan().subscription },
    });
    await renderWithProviders(<MyPlanScreen shopId="shop-1" isOwner onChangePlan={jest.fn()} />);
    await fireEvent.press(await screen.findByRole('button', { name: texts.checkPayment }));
    await waitFor(() =>
      expect(api.calls.some((c) => c.path === '/api/v1/barbershops/shop-1/subscription/sync')).toBe(true),
    );
  });
});

describe('PlansScreen', () => {
  it('subscribes and says the link was sent by email', async () => {
    const api = mockApi({
      'GET /api/v1/plans': {
        body: [plan({ id: 'p0', code: 'free', name: 'Gratis', priceMonthly: 0 }), plan()],
      },
      'POST /api/v1/barbershops/{id}/subscription': { status: 201, body: shopPlan().subscription },
    });
    await renderWithProviders(<PlansScreen shopId="shop-1" audience="BARBERSHOP" currentCode="free" />);
    await fireEvent.press(await screen.findByRole('button', { name: texts.payGateway }));
    expect(await screen.findByText(texts.sent.replace('{{plan}}', 'Pro'))).toBeTruthy();
    expect(api.calls.find((c) => c.method === 'POST')!.body).toEqual({
      planCode: 'pro',
      interval: 'MONTHLY',
      replace: true,
      paymentMethod: 'GATEWAY',
    });
  });
});

describe('plan limits anywhere', () => {
  it('shows "Ver mi plan" when any action hits the limit', async () => {
    const onSeePlan = jest.fn();
    await renderWithProviders(<PlanLimitNotice onSeePlan={onSeePlan} />);
    const error = new ApiError(
      403,
      { code: 'PLAN_LIMIT_REACHED', message: 'x', details: [{ key: 'promotions' }], requestId: 'r' },
      'r',
    );
    await act(async () => {
      await queryClient
        .getMutationCache()
        .build(queryClient, { mutationFn: () => Promise.reject(error) })
        .execute(undefined)
        .catch(() => undefined);
    });
    expect(await screen.findByText(texts.limitTitle)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: texts.seeMyPlan }));
    expect(onSeePlan).toHaveBeenCalled();
    expect(usePlanLimit.getState().hit).toBeNull();
  });
});

describe('VerifiedBadge', () => {
  it('shows the badge only when the barbershop is verified', async () => {
    mockApi({ 'GET /api/v1/barbershops/{id}/plan/badges': { body: { verified: true } } });
    await renderWithProviders(<VerifiedBadge barbershopId="shop-1" />);
    expect(await screen.findByText(texts.verified)).toBeTruthy();
  });
});
