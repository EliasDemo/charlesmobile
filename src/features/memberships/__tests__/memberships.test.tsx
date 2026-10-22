import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as WebBrowser from 'expo-web-browser';
import { apiError, mockApi, page, service } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import type { components } from '@/shared/api';
import texts from '@/shared/i18n/locales/es/memberships.json';
import errors from '@/shared/i18n/locales/es/errors.json';
import { MembershipPlansSection, MyMembershipsScreen, PayWithCreditButton, ShopMembershipsScreen } from '..';

type S = components['schemas'];

const planDto = (overrides: Partial<S['MembershipPlanDto']> = {}): S['MembershipPlanDto'] =>
  ({
    id: 'mp1',
    barbershopId: 'shop-1',
    name: 'Corte mensual',
    description: null,
    priceAmount: 6000,
    currency: 'PEN',
    creditsPerPeriod: 2,
    services: [],
    isActive: true,
    ...overrides,
  }) as S['MembershipPlanDto'];

const membership = (overrides: Partial<S['MembershipDto']> = {}): S['MembershipDto'] =>
  ({
    id: 'm1',
    plan: planDto(),
    barbershopName: 'Barbería Demo',
    status: 'ACTIVE',
    priceAmount: 6000,
    currency: 'PEN',
    credits: 2,
    nextCreditsExpireAt: '2030-02-01T05:00:00.000Z',
    checkoutUrl: null,
    currentPeriodEnd: '2030-02-01T05:00:00.000Z',
    cancelAtPeriodEnd: false,
    createdAt: '2030-01-01T05:00:00.000Z',
    ...overrides,
  }) as S['MembershipDto'];

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => ({ type: 'dismiss' })) }));
jest.mock('expo', () => ({
  ...jest.requireActual('expo'),
  requireOptionalNativeModule: (n: string) => (n === 'ExpoWebBrowser' ? {} : null),
}));

beforeEach(() => {
  resetAppState();
  signIn();
});

describe('MembershipPlansSection', () => {
  it('subscribes, opens the payment in the app and then asks for the real state', async () => {
    const api = mockApi({
      'GET /api/v1/barbershops/{id}/membership-plans': { body: [planDto()] },
      'POST /api/v1/membership-plans/{planId}/subscribe': {
        status: 201,
        body: membership({ status: 'PENDING', checkoutUrl: 'https://pay.example/m1' }),
      },
      'POST /api/v1/users/me/memberships/{membershipId}/sync': { body: membership() },
    });
    await renderWithProviders(<MembershipPlansSection barbershopId="shop-1" onRequireLogin={jest.fn()} />);
    expect(await screen.findByText('Corte mensual')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: texts.subscribe }));
    await waitFor(() => expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://pay.example/m1'));
    await waitFor(() =>
      expect(api.calls.some((c) => c.path === '/api/v1/users/me/memberships/m1/sync')).toBe(true),
    );
  });

  it('asks for an account first', async () => {
    resetAppState();
    mockApi({ 'GET /api/v1/barbershops/{id}/membership-plans': { body: [planDto()] } });
    const onRequireLogin = jest.fn();
    await renderWithProviders(
      <MembershipPlansSection barbershopId="shop-1" onRequireLogin={onRequireLogin} />,
    );
    await fireEvent.press(await screen.findByRole('button', { name: texts.subscribe }));
    expect(onRequireLogin).toHaveBeenCalled();
  });
});

describe('MyMembershipsScreen', () => {
  it('shows the credits left', async () => {
    mockApi({ 'GET /api/v1/users/me/memberships': { body: [membership()] } });
    await renderWithProviders(<MyMembershipsScreen onOpenShop={jest.fn()} />);
    expect(await screen.findByText('2')).toBeTruthy();
    expect(screen.getByText('créditos disponibles')).toBeTruthy();
  });

  it('explains the empty state', async () => {
    mockApi({ 'GET /api/v1/users/me/memberships': { body: [] } });
    await renderWithProviders(<MyMembershipsScreen onOpenShop={jest.fn()} />);
    expect(await screen.findByText(texts.empty)).toBeTruthy();
  });
});

describe('PayWithCreditButton', () => {
  it('pays a pending booking with a credit, and explains when it cannot', async () => {
    const api = mockApi({
      'GET /api/v1/users/me/memberships': { body: [membership()] },
      'POST /api/v1/bookings/{bookingId}/pay-with-membership': apiError(409, 'MEMBERSHIP_NOT_APPLICABLE'),
    });
    await renderWithProviders(
      <PayWithCreditButton bookingId="bk1" barbershopId="shop-1" onPaid={jest.fn()} />,
    );
    await fireEvent.press(await screen.findByRole('button', { name: /Pagar con crédito/ }));
    expect(await screen.findByText(errors.codes.MEMBERSHIP_NOT_APPLICABLE)).toBeTruthy();
    expect(api.calls.find((c) => c.method === 'POST')!.body).toEqual({ membershipId: 'm1' });
  });

  it('is not offered without credits at that barbershop', async () => {
    mockApi({ 'GET /api/v1/users/me/memberships': { body: [membership({ credits: 0 })] } });
    await renderWithProviders(
      <PayWithCreditButton bookingId="bk1" barbershopId="shop-1" onPaid={jest.fn()} />,
    );
    await waitFor(() => expect(screen.queryByRole('button', { name: /Pagar con crédito/ })).toBeNull());
  });
});

describe('ShopMembershipsScreen', () => {
  it('creates a membership plan in céntimos', async () => {
    const api = mockApi({
      'GET /api/v1/barbershops/{id}/membership-plans/manage': { body: [] },
      'GET /api/v1/barbershops/{id}/membership-members': { body: [] },
      'GET /api/v1/barbershops/{id}/services': { body: page([service()]) },
      'POST /api/v1/barbershops/{id}/membership-plans': {
        status: 201,
        body: { ...planDto(), activeMembers: 0 },
      },
    });
    signIn({ roles: ['CLIENT', 'OWNER'] });
    await renderWithProviders(<ShopMembershipsScreen shopId="shop-1" isOwner />);
    await fireEvent.press(await screen.findByRole('button', { name: texts.shop.new }));
    await fireEvent.changeText(screen.getByLabelText(texts.shop.name), 'Corte mensual');
    await fireEvent.changeText(screen.getByLabelText(texts.shop.price), '60');
    await fireEvent.changeText(screen.getByLabelText(texts.shop.credits), '2');
    await fireEvent.press(screen.getByRole('button', { name: texts.shop.create }));
    await waitFor(() =>
      expect(api.calls.find((c) => c.method === 'POST')!.body).toEqual({
        name: 'Corte mensual',
        priceAmount: 6000,
        creditsPerPeriod: 2,
      }),
    );
  });
});
