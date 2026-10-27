import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { mockApi } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import type { components } from '@/shared/api';
import texts from '@/shared/i18n/locales/es/ads.json';
import { StoreScreen } from '..';

type S = components['schemas'];

const product = (overrides: Partial<S['StoreProductDto']> = {}) =>
  ({
    id: 'p1',
    name: 'Cera mate',
    description: null,
    imageUrl: null,
    actionUrl: 'https://tienda.example/cera',
    audience: 'CLIENTS',
    category: 'COSMETICS',
    currency: 'PEN',
    priceAmount: 4500,
    offerPriceAmount: 3500,
    discountPercent: 22,
    couponCode: 'CHARLES10',
    offerEndsAt: '2030-01-31T04:59:00.000Z',
    priceText: 'Frasco de 100 g',
    isActive: true,
    sortOrder: 0,
    sponsorId: 'sp1',
    sponsorName: 'Marca Demo',
    sponsorLogoUrl: null,
    ...overrides,
  }) as S['StoreProductDto'];

const store = (overrides: Partial<S['StoreDto']> = {}): S['StoreDto'] => ({
  featured: [],
  categories: [{ category: 'COSMETICS', brands: 1 }],
  offers: [product()],
  products: [],
  brands: [
    {
      id: 'sp1',
      name: 'Marca Demo',
      category: 'COSMETICS',
      coverUrl: null,
      logoUrl: null,
      description: null,
      hasOffers: true,
      productCount: 1,
    },
  ],
  videos: [],
  deals: [
    {
      id: 'd1',
      name: 'Primer corte',
      type: 'PERCENTAGE',
      value: 15,
      currency: null,
      fromCharles: false,
      barbershopId: 'shop-1',
      barbershopName: 'Barbería Centro',
      daysOfWeek: [],
      endsAt: null,
    },
  ],
  ...overrides,
});

beforeEach(() => {
  resetAppState();
  jest.restoreAllMocks();
});

describe('StoreScreen', () => {
  it('shows an offer as the backend sends it: offer price, crossed normal price, discount and coupon', async () => {
    mockApi({ 'GET /api/v1/store': { body: store() } });
    await renderWithProviders(
      <StoreScreen audience="CLIENTS" onOpenSponsor={jest.fn()} onOpenBarbershop={jest.fn()} />,
    );
    expect(await screen.findByText('Cera mate')).toBeTruthy();
    expect(screen.getByText(/35[.,]00/)).toBeTruthy();
    expect(screen.getByText(/45[.,]00/)).toBeTruthy();
    expect(screen.getAllByText('-22 %').length).toBeGreaterThan(0);
    expect(screen.getByText('Cupón: CHARLES10')).toBeTruthy();
  });

  it('asks for the barbershop store and filters by category', async () => {
    const api = mockApi({ 'GET /api/v1/store': { body: store({ deals: [] }) } });
    await renderWithProviders(
      <StoreScreen audience="BARBERSHOPS" onOpenSponsor={jest.fn()} onOpenBarbershop={jest.fn()} />,
    );
    await fireEvent.press(await screen.findByRole('button', { name: texts.store.categories.COSMETICS }));
    const params = () => api.fetchMock.mock.calls.map(([r]) => new URL(r.url).searchParams);
    await waitFor(() => expect(params().some((q) => q.get('category') === 'COSMETICS')).toBe(true));
    expect(params()[0]!.get('audience')).toBe('BARBERSHOPS');
  });

  it('counts the click with the installation key (no session), then opens the brand shop', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const api = mockApi({
      'GET /api/v1/store': { body: store() },
      'POST /api/v1/store/products/{id}/click': { status: 204 },
    });
    await renderWithProviders(
      <StoreScreen audience="CLIENTS" onOpenSponsor={jest.fn()} onOpenBarbershop={jest.fn()} />,
    );
    await fireEvent.press(await screen.findByRole('button', { name: texts.seeInStore }));
    await waitFor(() => expect(api.calls.some((c) => c.method === 'POST')).toBe(true));
    const click = api.calls.find((c) => c.method === 'POST')!;
    expect(click.path).toContain('/store/products/p1/click');
    expect((click.body as { viewerKey?: string }).viewerKey).toEqual(expect.any(String));
    expect(openURL).toHaveBeenCalledWith('https://tienda.example/cera');
  });

  it('sends an empty body with a session, and opens the barbershop of a deal', async () => {
    signIn();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const api = mockApi({
      'GET /api/v1/store': { body: store() },
      'POST /api/v1/store/products/{id}/click': { status: 204 },
    });
    const onOpenBarbershop = jest.fn();
    await renderWithProviders(
      <StoreScreen audience="CLIENTS" onOpenSponsor={jest.fn()} onOpenBarbershop={onOpenBarbershop} />,
    );
    await fireEvent.press(await screen.findByRole('button', { name: texts.seeInStore }));
    await waitFor(() => expect(api.calls.find((c) => c.method === 'POST')!.body).toEqual({}));
    await fireEvent.press(screen.getByTestId('deal-d1'));
    expect(onOpenBarbershop).toHaveBeenCalledWith('shop-1');
  });

  it('shows the empty state when brands have nothing yet', async () => {
    mockApi({
      'GET /api/v1/store': {
        body: store({ offers: [], brands: [], deals: [], categories: [] }),
      },
    });
    await renderWithProviders(
      <StoreScreen audience="CLIENTS" onOpenSponsor={jest.fn()} onOpenBarbershop={jest.fn()} />,
    );
    expect(await screen.findByText(texts.store.emptyTitle)).toBeTruthy();
  });

  it('shows an expired offer at its normal price (the backend clears the offer fields)', async () => {
    mockApi({
      'GET /api/v1/store': {
        body: store({
          offers: [],
          products: [
            product({ offerPriceAmount: null, discountPercent: null, couponCode: null, offerEndsAt: null }),
          ],
        }),
      },
    });
    await renderWithProviders(
      <StoreScreen audience="CLIENTS" onOpenSponsor={jest.fn()} onOpenBarbershop={jest.fn()} />,
    );
    expect(await screen.findByText(/45[.,]00/)).toBeTruthy();
    expect(screen.queryByText(/Cupón/)).toBeNull();
  });
});
