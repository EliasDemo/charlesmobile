import { fireEvent, screen } from '@testing-library/react-native';
import { mockApi, searchPage, searchResult } from '@test/mockApi';
import { renderWithProviders, resetAppState } from '@test/render';
import texts from '@/shared/i18n/locales/es/search.json';
import { ExploreScreen } from '..';
import { EMPTY_FILTERS, useSearchStore } from '../hooks/searchStore';

// An installed build without the map's native module (MapLibre): the tests have none either.

beforeEach(() => {
  resetAppState();
  useSearchStore.setState({
    text: '',
    filters: EMPTY_FILTERS,
    center: null,
    view: 'map',
    outsidePeru: false,
  });
});

it('shows a clear notice instead of a gray map, and the list still works', async () => {
  mockApi({ 'GET /api/v1/search/barbershops': { body: searchPage([searchResult()]) } });
  await renderWithProviders(<ExploreScreen onOpenBarbershop={jest.fn()} onOpenFilters={jest.fn()} />);
  expect(screen.getByText(texts.map.unavailableTitle)).toBeTruthy();
  expect(screen.queryByTestId('results-map')).toBeNull();
  await fireEvent.press(screen.getByText(texts.map.backToList));
  expect(await screen.findByText('Barbería Demo Miraflores')).toBeTruthy();
});
