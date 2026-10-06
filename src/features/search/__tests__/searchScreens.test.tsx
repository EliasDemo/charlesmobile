import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { apiError, categories, mockApi, searchPage, searchResult } from '@test/mockApi';
import { renderWithProviders, resetAppState } from '@test/render';
import common from '@/shared/i18n/locales/es/common.json';
import texts from '@/shared/i18n/locales/es/search.json';
import { ExploreScreen, FiltersScreen } from '..';
import { EMPTY_FILTERS, useSearchStore } from '../hooks/searchStore';

jest.mock('expo-location', () => ({
  PermissionStatus: { GRANTED: 'granted', UNDETERMINED: 'undetermined', DENIED: 'denied' },
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const location = Location as jest.Mocked<typeof Location>;
const permission = (status: string, canAskAgain = true) =>
  ({ status, granted: status === 'granted', canAskAgain, expires: 'never' }) as never;

beforeEach(() => {
  resetAppState();
  jest.clearAllMocks();
  useSearchStore.setState({
    text: '',
    filters: EMPTY_FILTERS,
    center: null,
    view: 'list',
    outsidePeru: false,
  });
});

const props = () => ({ onOpenBarbershop: jest.fn(), onOpenFilters: jest.fn() });

describe('ExploreScreen: four states', () => {
  it('loading', async () => {
    globalThis.fetch = jest.fn(() => new Promise<Response>(() => undefined)) as unknown as typeof fetch;
    await renderWithProviders(<ExploreScreen {...props()} />);
    expect(screen.getByTestId('loading-state')).toBeTruthy();
  });

  it('error with retry', async () => {
    mockApi({ 'GET /api/v1/search/barbershops': apiError(500, 'INTERNAL_ERROR') });
    await renderWithProviders(<ExploreScreen {...props()} />);
    expect(await screen.findByTestId('error-state')).toBeTruthy();
    expect(screen.getByText(common.actions.retry)).toBeTruthy();
  });

  it('empty', async () => {
    mockApi({ 'GET /api/v1/search/barbershops': { body: searchPage([]) } });
    await renderWithProviders(<ExploreScreen {...props()} />);
    expect(await screen.findByText(texts.empty.title)).toBeTruthy();
  });

  it('data: the top rated by default, with only the data the API returns', async () => {
    const api = mockApi({
      'GET /api/v1/search/barbershops': {
        body: searchPage([
          searchResult(),
          searchResult({
            id: 'b2',
            name: 'Barbero Independiente',
            type: 'INDEPENDENT',
            isOpenNow: false,
            priceFrom: null,
            rating: { average: null, count: 0 },
            availableNow: true,
          }),
        ]),
      },
      'GET /api/v1/service-categories': { body: categories() },
    });
    const p = props();
    await renderWithProviders(<ExploreScreen {...p} />);
    expect(await screen.findByText('Barbería Demo Miraflores')).toBeTruthy();
    expect(screen.getByText(texts.topRated)).toBeTruthy();
    expect(screen.getByText(/Desde S\/\s?20/)).toBeTruthy();
    expect(screen.getAllByText(/Desde/)).toHaveLength(1); // priceFrom null is hidden
    expect(screen.queryByText(/^a \d/)).toBeNull(); // no distance without location
    expect(screen.getByText(common.rating.none)).toBeTruthy();
    expect(screen.getByText(texts.card.availableNow)).toBeTruthy();
    expect(screen.getByText(texts.card.independent)).toBeTruthy();
    const call = api.callsTo('GET', '/api/v1/search/barbershops')[0]!;
    expect(call.path).toBe('/api/v1/search/barbershops');
    await fireEvent.press(screen.getByTestId('result-b2'));
    expect(p.onOpenBarbershop).toHaveBeenCalledWith('b2');
  });

  it('loads the next page at the end of the list', async () => {
    const api = mockApi({
      'GET /api/v1/search/barbershops': (request) =>
        new URL(request.url).searchParams.get('cursor')
          ? { body: searchPage([searchResult({ id: 'b2', name: 'Segunda' })]) }
          : { body: searchPage([searchResult()], 'cursor-2') },
    });
    await renderWithProviders(<ExploreScreen {...props()} />);
    await screen.findByText('Barbería Demo Miraflores');
    await act(async () => {
      await fireEvent(screen.getByTestId('infinite-list'), 'endReached');
    });
    expect(await screen.findByText('Segunda')).toBeTruthy();
    expect(api.callsTo('GET', '/api/v1/search/barbershops')).toHaveLength(2);
  });

  it('offers to keep searching when the server stopped evaluating before finding results', async () => {
    mockApi({ 'GET /api/v1/search/barbershops': { body: searchPage([], 'c2', true) } });
    await renderWithProviders(<ExploreScreen {...props()} />);
    expect(await screen.findByText(common.list.searchMore)).toBeTruthy();
  });
});

describe('ExploreScreen: search, categories and filters', () => {
  it('searches by text after the user stops typing and by category chip', async () => {
    const api = mockApi({
      'GET /api/v1/search/barbershops': { body: searchPage([searchResult()]) },
      'GET /api/v1/service-categories': { body: categories() },
    });
    await renderWithProviders(<ExploreScreen {...props()} />);
    await fireEvent.changeText(screen.getByLabelText(texts.fieldLabel), 'c');
    expect(screen.getByText(texts.minChars)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText(texts.fieldLabel), 'corte');
    await waitFor(() =>
      expect(api.calls.some((c) => new URL(`http://x${c.path}`) && c.method === 'GET')).toBe(true),
    );
    await waitFor(
      () =>
        expect(api.fetchMock.mock.calls.some(([r]) => new URL(r.url).searchParams.get('q') === 'corte')).toBe(
          true,
        ),
      { timeout: 2000 },
    );
    await fireEvent.press(await screen.findByText('Barba'));
    await waitFor(() =>
      expect(
        api.fetchMock.mock.calls.some(([r]) => new URL(r.url).searchParams.get('category') === 'beard'),
      ).toBe(true),
    );
  });

  it('shows how many filters are active', async () => {
    mockApi({ 'GET /api/v1/search/barbershops': { body: searchPage([]) } });
    useSearchStore.setState({ filters: { ...EMPTY_FILTERS, openNow: true, minRating: 4 } });
    const p = props();
    await renderWithProviders(<ExploreScreen {...p} />);
    await fireEvent.press(screen.getByText('Filtros (2)'));
    expect(p.onOpenFilters).toHaveBeenCalled();
  });
});

describe('Cerca de mí', () => {
  beforeEach(() => {
    mockApi({
      'GET /api/v1/search/barbershops': { body: searchPage([searchResult({ distanceMeters: 1234 })]) },
    });
  });

  it('explains before asking and searches by distance after permission', async () => {
    location.getForegroundPermissionsAsync.mockResolvedValue(permission('undetermined'));
    location.requestForegroundPermissionsAsync.mockResolvedValue(permission('granted'));
    location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: -12.11, longitude: -77.03 },
    } as never);
    await renderWithProviders(<ExploreScreen {...props()} />);

    await fireEvent.press(screen.getByText(texts.nearMe));
    expect(await screen.findByText(texts.location.explainMessage)).toBeTruthy();
    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText(texts.location.explainContinue));
    await waitFor(() =>
      expect(useSearchStore.getState().center).toMatchObject({ latitude: -12.11, source: 'device' }),
    );
    expect(await screen.findByText(texts.nearMeActive)).toBeTruthy();
    expect(await screen.findByText(/a 1[.,]2 km/)).toBeTruthy();
  });

  it('keeps text search working when the permission is denied', async () => {
    location.getForegroundPermissionsAsync.mockResolvedValue(permission('undetermined'));
    location.requestForegroundPermissionsAsync.mockResolvedValue(permission('denied'));
    await renderWithProviders(<ExploreScreen {...props()} />);
    await fireEvent.press(screen.getByText(texts.nearMe));
    await fireEvent.press(await screen.findByText(texts.location.explainContinue));
    expect(await screen.findByText(texts.location.denied)).toBeTruthy();
    expect(useSearchStore.getState().center).toBeNull();
    expect(location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('offers the settings when the permission is blocked', async () => {
    location.getForegroundPermissionsAsync.mockResolvedValue(permission('denied', false));
    await renderWithProviders(<ExploreScreen {...props()} />);
    await fireEvent.press(screen.getByText(texts.nearMe));
    expect(await screen.findByText(texts.location.openSettings)).toBeTruthy();
  });

  it('uses the location directly if it was already granted', async () => {
    location.getForegroundPermissionsAsync.mockResolvedValue(permission('granted'));
    location.getCurrentPositionAsync.mockRejectedValue(new Error('no fix'));
    await renderWithProviders(<ExploreScreen {...props()} />);
    await fireEvent.press(screen.getByText(texts.nearMe));
    expect(await screen.findByText(texts.location.unavailable)).toBeTruthy();
    expect(screen.queryByText(texts.location.explainMessage)).toBeNull();
  });

  it('falls back to a search without location outside Peru', async () => {
    mockApi({
      'GET /api/v1/search/barbershops': (request) =>
        new URL(request.url).searchParams.has('lat')
          ? apiError(400, 'VALIDATION_ERROR', [{ field: 'lat', constraints: ['max'] }])
          : { body: searchPage([searchResult()]) },
    });
    useSearchStore.setState({ center: { latitude: 40.4, longitude: -3.7, source: 'device' } });
    await renderWithProviders(<ExploreScreen {...props()} />);
    expect(await screen.findByText(texts.location.outsidePeru)).toBeTruthy();
    expect(await screen.findByText('Barbería Demo Miraflores')).toBeTruthy();
  });
});

describe('map view', () => {
  it('shows the results on the map when the build supports it (Apple Maps or Android with key)', async () => {
    mockApi({ 'GET /api/v1/search/barbershops': { body: searchPage([searchResult()]) } });
    useSearchStore.setState({ view: 'map' });
    await renderWithProviders(<ExploreScreen {...props()} />);
    expect(await screen.findByTestId('results-map')).toBeTruthy();
    expect(screen.queryByText(texts.map.unavailableTitle)).toBeNull();
  });
});

describe('FiltersScreen', () => {
  it('applies the draft only on "Ver resultados"', async () => {
    mockApi({ 'GET /api/v1/service-categories': { body: categories() } });
    const onApplied = jest.fn();
    await renderWithProviders(<FiltersScreen onApplied={onApplied} />);
    await fireEvent.press(screen.getByText('Hasta S/ 20'));
    await fireEvent.press(screen.getByText('S/ 20–40'));
    await fireEvent.press(screen.getByText('Más de S/ 40'));
    await fireEvent.press(screen.getByText(/^4[.,]0 o más$/));
    await fireEvent.press(screen.getByText(texts.filtersScreen.typeIndependent));
    await fireEvent(screen.getByLabelText(texts.filtersScreen.openNow), 'valueChange', true);
    await fireEvent.press(screen.getByText(common.date.tomorrow));
    expect(useSearchStore.getState().filters).toEqual(EMPTY_FILTERS);

    await fireEvent.press(screen.getByText(texts.filtersScreen.apply));
    const applied = useSearchStore.getState().filters;
    expect(applied).toMatchObject({
      pricePreset: 'over40',
      minRating: 4,
      type: 'INDEPENDENT',
      openNow: true,
    });
    expect(applied.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(onApplied).toHaveBeenCalled();
  });

  it('offers distance and radius only with a location', async () => {
    mockApi({ 'GET /api/v1/service-categories': { body: categories() } });
    await renderWithProviders(<FiltersScreen onApplied={jest.fn()} />);
    expect(screen.queryByText(texts.sort.distance)).toBeNull();
    expect(screen.getByText(texts.filtersScreen.radiusNeedsLocation)).toBeTruthy();
  });

  it('clears the draft', async () => {
    mockApi({ 'GET /api/v1/service-categories': { body: categories() } });
    useSearchStore.setState({
      center: { latitude: -12.1, longitude: -77, source: 'device' },
      filters: { ...EMPTY_FILTERS, openNow: true, sort: 'distance', radiusKm: 5 },
    });
    await renderWithProviders(<FiltersScreen onApplied={jest.fn()} />);
    expect(screen.getByText(texts.sort.distance)).toBeTruthy();
    expect(await screen.findByText('Barba')).toBeTruthy();
    await fireEvent.press(screen.getByText(texts.filtersScreen.clear));
    await fireEvent.press(screen.getByText(texts.filtersScreen.apply));
    expect(useSearchStore.getState().filters).toEqual(EMPTY_FILTERS);
  });
});
