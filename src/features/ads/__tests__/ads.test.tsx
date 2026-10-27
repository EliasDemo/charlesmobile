import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { mockApi } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import texts from '@/shared/i18n/locales/es/ads.json';
import { AdSlot, SponsorScreen } from '..';

const ad = {
  id: 'pl1',
  title: 'Cera mate',
  imageUrl: null,
  actionUrl: 'https://tienda.example/cera',
  sponsorId: 'sp1',
  sponsorName: 'Marca Demo',
  sponsorLogoUrl: null,
};

beforeEach(() => {
  resetAppState();
  jest.restoreAllMocks();
});

describe('AdSlot', () => {
  it('shows nothing when the space has no ads', async () => {
    const api = mockApi({ 'GET /api/v1/placements': { body: [] } });
    await renderWithProviders(<AdSlot slot="home_banner" onOpenSponsor={jest.fn()} />);
    await waitFor(() => expect(api.fetchMock).toHaveBeenCalled());
    expect(screen.queryByTestId('ad-slot-home_banner')).toBeNull();
  });

  it('labels it as advertising and counts the view with the installation key (no session)', async () => {
    const api = mockApi({
      'GET /api/v1/placements': { body: [ad] },
      'POST /api/v1/placements/{id}/events': { status: 204 },
    });
    await renderWithProviders(<AdSlot slot="search_top" onOpenSponsor={jest.fn()} />);
    expect(await screen.findByText(texts.label)).toBeTruthy();
    await waitFor(() => expect(api.calls.some((c) => c.method === 'POST')).toBe(true));
    const event = api.calls.find((c) => c.method === 'POST')!.body as { type: string; viewerKey?: string };
    expect(event.type).toBe('IMPRESSION');
    expect(event.viewerKey).toEqual(expect.any(String));
  });

  it('counts the click without a key when there is a session, and opens the page outside', async () => {
    signIn();
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const api = mockApi({
      'GET /api/v1/placements': { body: [ad] },
      'POST /api/v1/placements/{id}/events': { status: 204 },
    });
    const onOpenSponsor = jest.fn();
    await renderWithProviders(<AdSlot slot="booking_success" onOpenSponsor={onOpenSponsor} />);
    await fireEvent.press(await screen.findByLabelText('Abrir anuncio: Cera mate'));
    await waitFor(() =>
      expect(api.calls.filter((c) => c.method === 'POST').map((c) => c.body)).toContainEqual({
        type: 'CLICK',
      }),
    );
    expect(openURL).toHaveBeenCalledWith('https://tienda.example/cera');
    await fireEvent.press(screen.getByLabelText('Ver catálogo de Marca Demo'));
    expect(onOpenSponsor).toHaveBeenCalledWith('sp1');
  });
});

describe('SponsorScreen', () => {
  it('lists the products with their price and store link, and counts the click', async () => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const api = mockApi({
      'POST /api/v1/store/products/{id}/click': { status: 204 },
      'GET /api/v1/sponsors/{id}': {
        body: {
          id: 'sp1',
          name: 'Marca Demo',
          logoUrl: null,
          coverUrl: null,
          category: 'COSMETICS',
          description: 'Ceras y pomadas',
          websiteUrl: null,
          videos: [],
          products: [
            {
              id: 'pr1',
              sponsorId: 'sp1',
              name: 'Cera mate',
              description: null,
              imageUrl: null,
              actionUrl: 'https://tienda.example/cera',
              priceText: 'Frasco de 100 g',
              priceAmount: 3500,
              offerPriceAmount: null,
              discountPercent: null,
              couponCode: null,
              offerEndsAt: null,
              currency: 'PEN',
              audience: 'ALL',
              sortOrder: 0,
              isActive: true,
            },
          ],
        },
      },
    });
    await renderWithProviders(<SponsorScreen id="sp1" />);
    expect(await screen.findByText('Ceras y pomadas')).toBeTruthy();
    expect(screen.getByText(/35[.,]00/)).toBeTruthy();
    expect(screen.getByText(texts.store.categories.COSMETICS)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: texts.seeInStore }));
    await waitFor(() =>
      expect(api.calls.some((c) => c.path === '/api/v1/store/products/pr1/click')).toBe(true),
    );
  });
});
