import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { components } from '@/shared/api';
import common from '@/shared/i18n/locales/es/common.json';
import errors from '@/shared/i18n/locales/es/errors.json';
import { HomeScreen } from '..';

type Health = components['schemas']['HealthResponseDto'];

const fetchMock = jest.fn<Promise<Response>, [Request]>();

function renderScreen(props: Partial<Parameters<typeof HomeScreen>[0]> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<HomeScreen apiUrl="http://api.test" {...props} />, { wrapper });
}

const respond = (status: number, body: Health | object) =>
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe('HomeScreen', () => {
  it('shows loading while the server answers', async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    await renderScreen();
    expect(screen.getByTestId('loading-state')).toBeTruthy();
  });

  it('shows the server as connected', async () => {
    respond(200, { status: 'ok', checks: { database: 'up', redis: 'up' } });
    await renderScreen();
    expect(await screen.findByText(common.home.serverOk)).toBeTruthy();
    expect(screen.getByText(/Base de datos: en línea/)).toBeTruthy();
  });

  it('shows a degraded server', async () => {
    respond(200, { status: 'degraded', checks: { database: 'down', redis: 'up' } });
    await renderScreen();
    expect(await screen.findByText(common.home.serverDegraded)).toBeTruthy();
    expect(screen.getByText(/Base de datos: caída/)).toBeTruthy();
  });

  it('shows a translated error with retry', async () => {
    respond(404, { code: 'NOT_FOUND', message: 'x', details: [], requestId: 'r' });
    await renderScreen();
    expect(await screen.findByText(errors.codes.NOT_FOUND)).toBeTruthy();
    expect(screen.getByText(common.actions.retry)).toBeTruthy();
  });

  it('offers the design system only when the route provides it', async () => {
    respond(200, { status: 'ok', checks: { database: 'up', redis: 'up' } });
    await renderScreen({ onOpenDesignSystem: jest.fn() });
    expect(await screen.findByText(common.home.designSystem)).toBeTruthy();
  });
});
