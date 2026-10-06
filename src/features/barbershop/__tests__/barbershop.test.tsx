import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import {
  apiError,
  barber,
  barbershop,
  businessHours,
  favorite,
  mockApi,
  review,
  searchResult,
  service,
} from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import common from '@/shared/i18n/locales/es/common.json';
import texts from '@/shared/i18n/locales/es/barbershop.json';
import { BarbershopScreen, ReviewsScreen, ServiceScreen } from '..';

const ID = '01990000-0000-7000-8000-000000000065';
const SERVICE_ID = '01990000-0000-7000-8000-00000000012d';

beforeEach(resetAppState);

const page = <T,>(items: T[], nextCursor: string | null = null) => ({ items, nextCursor });
/** Routes keyed as in the contract ("GET /api/v1/barbershops/{id}"); mockApi matches the templates. */ const shopApi =
  (routes: Record<string, unknown>) => mockApi(routes as never);

const detailRoutes = (overrides: Record<string, unknown> = {}) => ({
  'GET /api/v1/barbershops/{id}': { body: barbershop() },
  'GET /api/v1/barbershops/{id}/business-hours': { body: businessHours() },
  'GET /api/v1/barbershops/{id}/services': {
    body: page([
      service(),
      service({ id: 's2', name: 'Perfilado de barba', category: { key: 'beard', name: 'Barba' } }),
    ]),
  },
  'GET /api/v1/barbershops/{id}/barbers': { body: page([barber()]) },
  'GET /api/v1/barbershops/{id}/reviews': { body: page([review()]) },
  ...overrides,
});

const detailProps = () => ({
  id: ID,
  onBack: jest.fn(),
  onOpenService: jest.fn(),
  onOpenReviews: jest.fn(),
  onRequireLogin: jest.fn(),
});

describe('BarbershopScreen', () => {
  it('shows loading first', async () => {
    globalThis.fetch = jest.fn(() => new Promise<Response>(() => undefined)) as unknown as typeof fetch;
    await renderWithProviders(<BarbershopScreen {...detailProps()} />);
    expect(screen.getByTestId('loading-state')).toBeTruthy();
  });

  it('explains a missing barbershop and offers to go back', async () => {
    shopApi({ 'GET /api/v1/barbershops/{id}': apiError(404, 'NOT_FOUND') });
    const props = detailProps();
    await renderWithProviders(<BarbershopScreen {...props} />);
    expect(await screen.findByText(texts.notFound.title)).toBeTruthy();
    await fireEvent.press(screen.getByText(texts.notFound.action));
    expect(props.onBack).toHaveBeenCalled();
  });

  it('shows an error with retry', async () => {
    shopApi({ 'GET /api/v1/barbershops/{id}': apiError(500, 'INTERNAL_ERROR') });
    await renderWithProviders(<BarbershopScreen {...detailProps()} />);
    expect(await screen.findByTestId('error-state')).toBeTruthy();
  });

  it('shows the detail with every section and hides what the API does not send', async () => {
    shopApi(detailRoutes());
    const props = detailProps();
    await renderWithProviders(<BarbershopScreen {...props} />);
    expect(await screen.findByText('Barbería Demo Miraflores')).toBeTruthy();
    expect(await screen.findByText('Corte clásico')).toBeTruthy();
    expect(screen.getByText('Perfilado de barba')).toBeTruthy();
    expect(screen.getByText('Barba')).toBeTruthy(); // category group
    expect(screen.getByText('Barbero Demo')).toBeTruthy();
    expect(screen.getByText('Excelente corte')).toBeTruthy();
    expect(screen.getAllByText('09:00–13:00 · 14:00–20:00').length).toBeGreaterThan(0);
    expect(screen.getByText(texts.hours.closedDay)).toBeTruthy(); // Sunday
    // phone, description and links are null: hidden
    expect(screen.queryByText(texts.call)).toBeNull();
    expect(screen.queryByText(texts.links.website)).toBeNull();
    expect(screen.getByText(texts.directions)).toBeTruthy();
    // booking arrives in M4
    expect(screen.getByRole('button', { name: texts.book })).toBeDisabled();
    expect(screen.getAllByText(texts.bookSoon).length).toBeGreaterThan(0);

    await fireEvent.press(screen.getByLabelText(/Corte clásico, S\/\s?25[.,]00, 30 min/));
    expect(props.onOpenService).toHaveBeenCalledWith(SERVICE_ID);
    await fireEvent.press(screen.getByText(texts.reviews.seeAll));
    expect(props.onOpenReviews).toHaveBeenCalled();
  });

  it('shows the closure, phone and links when the API sends them', async () => {
    shopApi(
      detailRoutes({
        'GET /api/v1/barbershops/{id}': {
          body: barbershop({
            status: 'TEMPORARILY_CLOSED',
            closure: { reason: 'Remodelación.', expectedReopenAt: '2030-02-01T14:00:00.000Z' },
            phone: '+51 1 234 5678',
            description: 'Cortes clásicos y modernos.',
            links: { website: 'https://barberia.example', instagram: '@barberia', facebook: null },
          }),
        },
      }),
    );
    await renderWithProviders(<BarbershopScreen {...detailProps()} />);
    expect(await screen.findByText(texts.temporarilyClosed)).toBeTruthy();
    expect(screen.getByText(/Remodelación\. Reabre el .*1 de febrero de 2030/)).toBeTruthy();
    expect(screen.getByText('Cortes clásicos y modernos.')).toBeTruthy();
    expect(screen.getByText(texts.call)).toBeTruthy();
    expect(screen.getByText(texts.links.website)).toBeTruthy();
    expect(screen.getByText('Instagram: @barberia')).toBeTruthy(); // not a URL: shown, not opened
  });

  it('keeps the rest of the detail when one section fails', async () => {
    shopApi(detailRoutes({ 'GET /api/v1/barbershops/{id}/services': apiError(500, 'INTERNAL_ERROR') }));
    await renderWithProviders(<BarbershopScreen {...detailProps()} />);
    expect(await screen.findByText('Barbero Demo')).toBeTruthy();
    expect(screen.getByTestId('error-state')).toBeTruthy();
  });

  it('shows empty sections', async () => {
    shopApi(
      detailRoutes({
        'GET /api/v1/barbershops/{id}/services': { body: page([]) },
        'GET /api/v1/barbershops/{id}/barbers': { body: page([]) },
        'GET /api/v1/barbershops/{id}/reviews': { body: page([]) },
      }),
    );
    await renderWithProviders(<BarbershopScreen {...detailProps()} />);
    expect(await screen.findByText(texts.services.empty)).toBeTruthy();
    expect(screen.getByText(texts.barbers.empty)).toBeTruthy();
    expect(screen.getByText(texts.reviews.empty)).toBeTruthy();
  });
});

describe('favorite button', () => {
  it('sends visitors to login', async () => {
    shopApi(detailRoutes());
    const props = detailProps();
    await renderWithProviders(<BarbershopScreen {...props} />);
    await fireEvent.press(await screen.findByLabelText(texts.favorite.add));
    expect(props.onRequireLogin).toHaveBeenCalled();
  });

  it('marks and unmarks a favorite at once', async () => {
    signIn();
    shopApi({
      ...detailRoutes(),
      'GET /api/v1/me/favorites': { body: page([]) },
      'PUT /api/v1/me/favorites/{barbershopId}': { status: 204 },
      'DELETE /api/v1/me/favorites/{barbershopId}': { status: 204 },
    });
    await renderWithProviders(<BarbershopScreen {...detailProps()} />);
    await fireEvent.press(await screen.findByLabelText(texts.favorite.add));
    expect(await screen.findByLabelText(texts.favorite.remove)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(texts.favorite.remove));
    expect(await screen.findByLabelText(texts.favorite.add)).toBeTruthy();
  });

  it('reads the favorite state from the list and goes back if saving fails', async () => {
    signIn();
    shopApi({
      ...detailRoutes(),
      'GET /api/v1/me/favorites': { body: page([favorite()]) },
      'DELETE /api/v1/me/favorites/{barbershopId}': apiError(500, 'INTERNAL_ERROR'),
    });
    await renderWithProviders(<BarbershopScreen {...detailProps()} />);
    await fireEvent.press(await screen.findByLabelText(texts.favorite.remove));
    expect(await screen.findByText(texts.favorite.error)).toBeTruthy();
    expect(screen.getByLabelText(texts.favorite.remove)).toBeTruthy();
  });
});

describe('ServiceScreen', () => {
  const serviceRoutes = (overrides: Record<string, unknown> = {}) => ({
    'GET /api/v1/barbershops/{id}': { body: barbershop() },
    'GET /api/v1/barbershops/{id}/services': { body: page([service()]) },
    'GET /api/v1/barbershops/{id}/availability/next': {
      body: {
        slot: { startAt: '2030-01-07T14:00:00.000Z', endAt: '2030-01-07T14:30:00.000Z', barberIds: [] },
      },
    },
    ...overrides,
  });
  const props = () => ({
    barbershopId: ID,
    serviceId: SERVICE_ID,
    onBack: jest.fn(),
    onOpenBarbershop: jest.fn(),
  });

  it('shows the next slot in the barbershop zone', async () => {
    shopApi(serviceRoutes());
    await renderWithProviders(<ServiceScreen {...props()} />);
    expect(await screen.findByText('Corte clásico')).toBeTruthy();
    expect((await screen.findByTestId('next-slot')).props.children).toMatch(/7.*a las 09:00/);
    expect(screen.queryByText(texts.service.alternativesTitle)).toBeNull();
  });

  it('shows alternatives when there is no slot', async () => {
    shopApi(
      serviceRoutes({
        'GET /api/v1/barbershops/{id}/availability/next': { body: { slot: null } },
        'GET /api/v1/barbershops/{id}/alternatives': {
          body: {
            date: '2030-01-07',
            categoryKey: 'haircut',
            items: [
              {
                barbershop: searchResult({ id: 'other', name: 'Barbería Demo San Isidro' }),
                service: {
                  id: 'x',
                  name: 'Corte',
                  price: { amount: 3000, currency: 'PEN' },
                  durationMinutes: 30,
                },
                firstSlot: { startAt: '2030-01-07T15:00:00.000Z', endAt: '2030-01-07T15:30:00.000Z' },
              },
            ],
          },
        },
      }),
    );
    const p = props();
    await renderWithProviders(<ServiceScreen {...p} />);
    expect(await screen.findByText(texts.service.noSlot)).toBeTruthy();
    expect(await screen.findByText('Barbería Demo San Isidro')).toBeTruthy();
    expect(screen.getByText(/Corte · S\/\s?30[.,]00 · .*10:00/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('result-other'));
    expect(p.onOpenBarbershop).toHaveBeenCalledWith('other');
  });

  it('says when there are no alternatives either', async () => {
    shopApi(
      serviceRoutes({
        'GET /api/v1/barbershops/{id}/availability/next': { body: { slot: null } },
        'GET /api/v1/barbershops/{id}/alternatives': {
          body: { date: '2030-01-07', categoryKey: 'haircut', items: [] },
        },
      }),
    );
    await renderWithProviders(<ServiceScreen {...props()} />);
    expect(await screen.findByText(texts.service.alternativesEmpty)).toBeTruthy();
  });

  it('handles a service that no longer exists', async () => {
    shopApi(serviceRoutes({ 'GET /api/v1/barbershops/{id}/services': { body: page([]) } }));
    const p = props();
    await renderWithProviders(<ServiceScreen {...p} />);
    await fireEvent.press(await screen.findByText(texts.notFound.action));
    expect(p.onBack).toHaveBeenCalled();
  });
});

describe('ReviewsScreen', () => {
  it('lists reviews with the barbershop response and filters by stars', async () => {
    const api = shopApi({
      'GET /api/v1/barbershops/{id}': { body: barbershop() },
      'GET /api/v1/barbershops/{id}/barbers': {
        body: page([barber(), barber({ id: 'b2', displayName: 'Otro' })]),
      },
      'GET /api/v1/barbershops/{id}/reviews': (request: Request) =>
        new URL(request.url).searchParams.get('rating') === '1'
          ? { body: page([]) }
          : {
              body: page([
                review({ response: { text: '¡Gracias!', respondedAt: '2030-01-08T00:00:00.000Z' } }),
              ]),
            },
    });
    await renderWithProviders(<ReviewsScreen barbershopId={ID} />);
    expect(await screen.findByText('Excelente corte')).toBeTruthy();
    expect(screen.getByText('¡Gracias!')).toBeTruthy();
    // The filter chip and the review's stars share the label.
    expect(screen.getAllByLabelText('5 estrellas')).toHaveLength(2);
    await fireEvent.press(screen.getByText('1 estrella'));
    expect(await screen.findByText(texts.reviews.filterEmpty)).toBeTruthy();
    await waitFor(() =>
      expect(api.fetchMock.mock.calls.some(([r]) => new URL(r.url).searchParams.get('rating') === '1')).toBe(
        true,
      ),
    );
    await fireEvent.press(screen.getByText('Otro'));
    await waitFor(() =>
      expect(
        api.fetchMock.mock.calls.some(([r]) => new URL(r.url).searchParams.get('barberId') === 'b2'),
      ).toBe(true),
    );
  });

  it('shows the error state', async () => {
    shopApi({
      'GET /api/v1/barbershops/{id}': { body: barbershop() },
      'GET /api/v1/barbershops/{id}/reviews': apiError(500, 'INTERNAL_ERROR'),
    });
    await renderWithProviders(<ReviewsScreen barbershopId={ID} />);
    expect(await screen.findByText(common.actions.retry)).toBeTruthy();
  });
});
