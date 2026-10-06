import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { apiError, favorite, mockApi } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import common from '@/shared/i18n/locales/es/common.json';
import texts from '@/shared/i18n/locales/es/favorites.json';
import { FavoritesScreen } from '..';

beforeEach(() => {
  resetAppState();
  signIn();
});

const page = <T,>(items: T[], nextCursor: string | null = null) => ({ items, nextCursor });

describe('FavoritesScreen', () => {
  it('loading', async () => {
    globalThis.fetch = jest.fn(() => new Promise<Response>(() => undefined)) as unknown as typeof fetch;
    await renderWithProviders(<FavoritesScreen onOpenBarbershop={jest.fn()} />);
    expect(screen.getByTestId('loading-state')).toBeTruthy();
  });

  it('empty', async () => {
    mockApi({ 'GET /api/v1/me/favorites': { body: page([]) } });
    await renderWithProviders(<FavoritesScreen onOpenBarbershop={jest.fn()} />);
    expect(await screen.findByText(texts.empty.title)).toBeTruthy();
  });

  it('error with retry', async () => {
    mockApi({ 'GET /api/v1/me/favorites': apiError(500, 'INTERNAL_ERROR') });
    await renderWithProviders(<FavoritesScreen onOpenBarbershop={jest.fn()} />);
    expect(await screen.findByText(common.actions.retry)).toBeTruthy();
  });

  it('lists favorites, opens one and removes it', async () => {
    let removed = false;
    const api = mockApi({
      'GET /api/v1/me/favorites': () => ({ body: page(removed ? [] : [favorite()]) }),
      'DELETE /api/v1/me/favorites/{barbershopId}': () => {
        removed = true;
        return { status: 204 };
      },
    });
    const onOpen = jest.fn();
    await renderWithProviders(<FavoritesScreen onOpenBarbershop={onOpen} />);
    await fireEvent.press(await screen.findByText('Barbería Demo Miraflores'));
    expect(onOpen).toHaveBeenCalledWith(favorite().barbershopId);

    await fireEvent.press(screen.getByLabelText('Quitar Barbería Demo Miraflores de favoritas'));
    await waitFor(() => expect(api.calls.some((c) => c.method === 'DELETE')).toBe(true));
    expect(await screen.findByText(texts.empty.title)).toBeTruthy();
  });
});
