import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { mockApi } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import type { components } from '@/shared/api';
import texts from '@/shared/i18n/locales/es/shop.json';
import { ShopGalleryScreen } from '..';
import { PhotoField } from '../components/PhotoField';

type S = components['schemas'];

// The installed build may lack the photo modules: test both sides of `photosAvailable`.
const mockAvailable = { value: false };
const mockPick = jest.fn();
jest.mock('@/shared/lib/photos', () => ({
  photosAvailable: () => mockAvailable.value,
  pickPhoto: (...args: unknown[]) => mockPick(...args),
  photoForm: () => new FormData(),
}));

const image = (overrides: Partial<S['GalleryImageManageDto']> = {}): S['GalleryImageManageDto'] => ({
  id: 'g1',
  barbershopId: 's1',
  barberId: 'b1',
  barberName: 'Barbero Demo',
  thumbUrl: '/api/v1/media/img/g1-400.webp',
  largeUrl: '/api/v1/media/img/g1-1600.webp',
  width: 1600,
  height: 1200,
  caption: 'Degradado',
  styles: [],
  service: null,
  pinned: false,
  faceShape: null,
  labelConfirmed: false,
  isDemo: false,
  createdAt: '2030-01-07T15:00:00.000Z',
  openReports: 0,
  hidden: false,
  removed: false,
  ...overrides,
});

beforeEach(() => {
  resetAppState();
  signIn({ roles: ['CLIENT', 'OWNER'] });
  mockAvailable.value = false;
  mockPick.mockReset();
});

describe('PhotoField', () => {
  it('explains that uploading arrives with the next build when the modules are missing', async () => {
    mockApi({});
    await renderWithProviders(<PhotoField shopId="s1" kind="cover" name="Barbería" url={null} />);
    expect(screen.getByText(texts.photos.unavailable)).toBeTruthy();
    expect(screen.queryByRole('button', { name: texts.photos.choose })).toBeNull();
  });

  it('uploads the chosen cover', async () => {
    mockAvailable.value = true;
    mockPick.mockResolvedValue({
      status: 'picked',
      photo: { uri: 'file://a.jpg', name: 'photo.jpg', type: 'image/jpeg' },
    });
    const api = mockApi({
      'PUT /api/v1/barbershops/{id}/cover': {
        body: { logoUrl: null, coverUrl: '/c.webp', coverThumbUrl: '/t.webp' },
      },
    });
    await renderWithProviders(<PhotoField shopId="s1" kind="cover" name="Barbería" url={null} />);
    await fireEvent.press(screen.getByRole('button', { name: texts.photos.choose }));
    await waitFor(() =>
      expect(api.calls.some((c) => c.method === 'PUT' && c.path.endsWith('/cover'))).toBe(true),
    );
    expect(mockPick).toHaveBeenCalledWith('library', [16, 9]);
  });

  it('says why when the permission is denied', async () => {
    mockAvailable.value = true;
    mockPick.mockResolvedValue({ status: 'denied' });
    mockApi({});
    await renderWithProviders(<PhotoField shopId="s1" kind="logo" name="Barbería" url={null} />);
    await fireEvent.press(screen.getByRole('button', { name: texts.photos.take }));
    expect(await screen.findByText(texts.photos.denied)).toBeTruthy();
  });
});

describe('ShopGalleryScreen', () => {
  it('flags hidden photos and highlights or deletes one', async () => {
    const api = mockApi({
      'GET /api/v1/me/barbershops/{id}/gallery': {
        body: { items: [image(), image({ id: 'g2', hidden: true, openReports: 3 })], nextCursor: null },
      },
      'PATCH /api/v1/barbershops/{id}/gallery/{imageId}': { body: image({ pinned: true }) },
      'DELETE /api/v1/barbershops/{id}/gallery/{imageId}': { status: 204 },
    });
    await renderWithProviders(<ShopGalleryScreen shopId="s1" />);
    const grid = await screen.findByTestId('manage-grid');
    fireEvent(grid, 'layout', { nativeEvent: { layout: { width: 330, height: 200 } } });
    expect(await screen.findByLabelText(/Oculta por reportes/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('managed-g1'));
    await fireEvent.press(screen.getByRole('button', { name: texts.gallery.pin }));
    await waitFor(() => expect(api.calls.find((c) => c.method === 'PATCH')?.body).toEqual({ pinned: true }));
  });

  it('needs consent before publishing a new photo', async () => {
    mockAvailable.value = true;
    mockPick.mockResolvedValue({
      status: 'picked',
      photo: { uri: 'file://a.jpg', name: 'photo.jpg', type: 'image/jpeg' },
    });
    const api = mockApi({
      'GET /api/v1/me/barbershops/{id}/gallery': { body: { items: [], nextCursor: null } },
      'POST /api/v1/barbershops/{id}/barbers/{barberId}/gallery': { status: 201, body: image() },
    });
    await renderWithProviders(<ShopGalleryScreen shopId="s1" ownBarberId="b1" />);
    await fireEvent.press(await screen.findByRole('button', { name: texts.gallery.upload }));
    await fireEvent.press(screen.getByRole('button', { name: texts.photos.choose }));
    const send = screen.getByRole('button', { name: texts.gallery.send });
    await waitFor(() => expect(send).toBeDisabled());
    await fireEvent.press(screen.getByRole('checkbox', { name: texts.gallery.consent }));
    await fireEvent.press(screen.getByRole('button', { name: texts.gallery.send }));
    await waitFor(() =>
      expect(
        api.calls.some((c) => c.method === 'POST' && c.path === '/api/v1/barbershops/s1/barbers/b1/gallery'),
      ).toBe(true),
    );
  });
});
