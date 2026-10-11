import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { apiError, mockApi } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import type { components } from '@/shared/api';
import { mediaUrl } from '@/shared/api';
import { env } from '@/shared/config';
import texts from '@/shared/i18n/locales/es/gallery.json';
import { Monogram } from '@/shared/ui';
import { GalleryScreen, GallerySection } from '..';

type S = components['schemas'];

const photo = (overrides: Partial<S['GalleryImageDto']> = {}): S['GalleryImageDto'] => ({
  id: 'g1',
  barbershopId: 's1',
  barberId: 'b1',
  barberName: 'Barbero Demo',
  thumbUrl: '/api/v1/media/img/g1-400.webp',
  largeUrl: '/api/v1/media/img/g1-1600.webp',
  width: 1600,
  height: 1200,
  caption: 'Degradado bajo con barba',
  styles: [{ id: 'st1', key: 'fade_low', name: 'Degradado bajo' }],
  service: {
    id: 'sv1',
    name: 'Corte clásico',
    price: { amount: 2500, currency: 'PEN' },
    durationMinutes: 30,
  },
  pinned: false,
  createdAt: '2030-01-07T15:00:00.000Z',
  ...overrides,
});

beforeEach(() => resetAppState());

describe('mediaUrl', () => {
  it('prepends the backend origin to relative development URLs', () => {
    expect(mediaUrl('/api/v1/media/img/a.webp')).toBe(`${env.apiUrl}/api/v1/media/img/a.webp`);
    expect(mediaUrl('https://cdn.example.com/a.webp')).toBe('https://cdn.example.com/a.webp');
    expect(mediaUrl(null)).toBeNull();
  });

  it('Monogram shows the photo when there is one and the initials otherwise', async () => {
    const { rerender } = await renderWithProviders(<Monogram name="Ana Pérez" imageUrl="/x.webp" />);
    expect(screen.getByTestId('monogram-image', { includeHiddenElements: true })).toBeTruthy();
    await rerender(<Monogram name="Ana Pérez" imageUrl={null} />);
    expect(screen.queryByTestId('monogram-image', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByText('AP', { includeHiddenElements: true })).toBeTruthy();
  });
});

describe('GallerySection', () => {
  it('shows nothing while the barbershop has no photos', async () => {
    mockApi({
      'GET /api/v1/barbershops/{id}/gallery': { body: { pinned: [], items: [], nextCursor: null } },
    });
    await renderWithProviders(
      <GallerySection barbershopId="s1" onOpenAll={jest.fn()} onBookStyle={jest.fn()} />,
    );
    await waitFor(() => expect(screen.queryByText(texts.title)).toBeNull());
  });

  it('opens a photo and books its style with the service and barber', async () => {
    mockApi({
      'GET /api/v1/barbershops/{id}/gallery': {
        body: { pinned: [photo({ id: 'g0', pinned: true })], items: [photo()], nextCursor: null },
      },
    });
    const onBookStyle = jest.fn();
    await renderWithProviders(
      <GallerySection barbershopId="s1" onOpenAll={jest.fn()} onBookStyle={onBookStyle} />,
    );
    expect(await screen.findByText(texts.title)).toBeTruthy();
    fireEvent(screen.getByTestId('gallery-grid'), 'layout', {
      nativeEvent: { layout: { width: 330, height: 200 } },
    });
    await fireEvent.press(await screen.findByTestId('photo-g1'));
    expect(screen.getByText('Por Barbero Demo')).toBeTruthy();
    expect(screen.getByText('Degradado bajo')).toBeTruthy();
    // Without a session there is no "report".
    expect(screen.queryByRole('button', { name: texts.report.action })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: /Reservar este estilo/ }));
    expect(onBookStyle).toHaveBeenCalledWith('sv1', 'b1');
  });
});

describe('GalleryScreen', () => {
  it('lets a signed-in person report a photo', async () => {
    signIn();
    const api = mockApi({
      'GET /api/v1/barbershops/{id}/gallery': { body: { pinned: [], items: [photo()], nextCursor: null } },
      'POST /api/v1/gallery/{imageId}/reports': { status: 204 },
    });
    await renderWithProviders(<GalleryScreen barbershopId="s1" onBookStyle={jest.fn()} />);
    const grid = await screen.findByTestId('gallery-grid');
    fireEvent(grid, 'layout', { nativeEvent: { layout: { width: 330, height: 200 } } });
    await fireEvent.press(await screen.findByTestId('photo-g1'));
    await fireEvent.press(screen.getByRole('button', { name: texts.report.action }));
    await fireEvent.press(screen.getByText(texts.report.reasons.NO_CONSENT));
    await fireEvent.press(screen.getByRole('button', { name: texts.report.send }));
    await waitFor(() =>
      expect(api.calls.find((c) => c.method === 'POST')?.body).toEqual({ reason: 'NO_CONSENT' }),
    );
  });

  it('explains an empty gallery', async () => {
    mockApi({
      'GET /api/v1/barbershops/{id}/gallery': { body: { pinned: [], items: [], nextCursor: null } },
    });
    await renderWithProviders(<GalleryScreen barbershopId="s1" onBookStyle={jest.fn()} />);
    expect(await screen.findByText(texts.empty)).toBeTruthy();
  });

  it('shows errors with retry', async () => {
    mockApi({ 'GET /api/v1/barbershops/{id}/gallery': apiError(500, 'INTERNAL_ERROR') });
    await renderWithProviders(<GalleryScreen barbershopId="s1" onBookStyle={jest.fn()} />);
    expect(await screen.findByRole('button', { name: /reintentar/i })).toBeTruthy();
  });
});
