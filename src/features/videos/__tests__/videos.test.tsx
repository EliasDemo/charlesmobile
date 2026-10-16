import { screen } from '@testing-library/react-native';
import { mockApi } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import type { components } from '@/shared/api';
import texts from '@/shared/i18n/locales/es/videos.json';
import { ProfileVideos, ShopVideosScreen } from '..';

type S = components['schemas'];

const video = (overrides: Partial<S['VideoDto']> = {}): S['VideoDto'] => ({
  id: 'v1',
  status: 'READY',
  videoUrl: '/api/v1/media/video/v1.mp4',
  posterUrl: '/api/v1/media/img/v1/poster.webp',
  durationMs: 20000,
  caption: 'Degradado',
  failureReason: null,
  createdAt: '2030-01-01T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  resetAppState();
  signIn({ roles: ['CLIENT', 'OWNER'] });
});

describe('ShopVideosScreen', () => {
  it('shows each video with its state and why one failed', async () => {
    mockApi({
      'GET /api/v1/barbershops/{id}/videos/manage': {
        body: [
          video(),
          video({ id: 'v2', status: 'PROCESSING', videoUrl: null, posterUrl: null, caption: null }),
          video({ id: 'v3', status: 'FAILED', failureReason: 'TOO_LONG', videoUrl: null, posterUrl: null }),
        ],
      },
    });
    await renderWithProviders(<ShopVideosScreen shopId="shop-1" />);
    expect(await screen.findByText(texts.status.READY)).toBeTruthy();
    expect(screen.getByText(texts.status.PROCESSING)).toBeTruthy();
    expect(screen.getByText(texts.failure.TOO_LONG)).toBeTruthy();
    // This build has no video modules yet: it says so instead of failing.
    expect(screen.getByText(texts.unavailable)).toBeTruthy();
  });

  it('explains the empty state', async () => {
    mockApi({ 'GET /api/v1/barbershops/{id}/videos/manage': { body: [] } });
    await renderWithProviders(<ShopVideosScreen shopId="shop-1" />);
    expect(await screen.findByText(texts.emptyMine)).toBeTruthy();
  });
});

describe('ProfileVideos', () => {
  it('shows the posters of the ready videos', async () => {
    mockApi({ 'GET /api/v1/barber-profiles/{id}/videos': { body: [video()] } });
    await renderWithProviders(<ProfileVideos profileId="bp1" />);
    expect(await screen.findByTestId('video-v1')).toBeTruthy();
  });

  it('says there are none yet', async () => {
    mockApi({ 'GET /api/v1/barber-profiles/{id}/videos': { body: [] } });
    await renderWithProviders(<ProfileVideos profileId="bp1" />);
    expect(await screen.findByText(texts.empty)).toBeTruthy();
  });
});
