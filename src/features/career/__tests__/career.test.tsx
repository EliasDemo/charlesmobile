import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { apiError, mockApi, tokens } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import type { components } from '@/shared/api';
import { tokenStorage } from '@/shared/api/tokenStorage';
import texts from '@/shared/i18n/locales/es/career.json';
import { CareerProfileFormScreen, MyCareerProfileScreen, PublicCareerProfileScreen, RankingScreen } from '..';

type S = components['schemas'];

const profile = (overrides: Partial<S['BarberProfileDto']> = {}): S['BarberProfileDto'] => ({
  id: 'bp1',
  location: null,
  displayName: 'Julián',
  headline: 'Especialista en degradados',
  bio: null,
  photoUrl: null,
  yearsExperience: 4,
  district: 'Miraflores',
  availableForWork: false,
  ratingAverage: null,
  ratingCount: 0,
  attendedCount: 12,
  rank: null,
  specialties: [],
  workplaces: [
    {
      barberId: 'b1',
      barbershopId: 'shop-1',
      barbershopName: 'Barbería Demo',
      barbershopType: 'SHOP',
      current: true,
      since: '2029-01-01T00:00:00.000Z',
      until: null,
    },
  ],
  createdAt: '2029-01-01T00:00:00.000Z',
  ...overrides,
});

const emptyPage = { items: [], nextCursor: null };
const myProps = () => ({
  onEdit: jest.fn(),
  onSpecialties: jest.fn(),
  onAddCut: jest.fn(),
  onOpenPublic: jest.fn(),
  onOpenShop: jest.fn(),
  onJobs: jest.fn(),
  onApplications: jest.fn(),
});

beforeEach(() => {
  resetAppState();
  signIn();
});

describe('MyCareerProfileScreen', () => {
  it('invites to create the profile when there is none (404)', async () => {
    mockApi({ 'GET /api/v1/me/barber-profile': apiError(404, 'NOT_FOUND') });
    const props = myProps();
    await renderWithProviders(<MyCareerProfileScreen {...props} />);
    await fireEvent.press(await screen.findByRole('button', { name: texts.create.action }));
    expect(props.onEdit).toHaveBeenCalled();
  });

  it('shows how to enter the ranking and explains a barbershop it cannot leave yet', async () => {
    mockApi({
      'GET /api/v1/me/barber-profile': { body: profile() },
      'GET /api/v1/barber-profiles/{id}/portfolio': { body: emptyPage },
      'POST /api/v1/me/barber-profile/workplaces/{barberId}/leave': apiError(409, 'HAS_FUTURE_BOOKINGS'),
    });
    const props = myProps();
    await renderWithProviders(<MyCareerProfileScreen {...props} />);
    // No "out of the ranking": the way in, and steps the barber controls.
    expect(await screen.findByText(texts.progress.title)).toBeTruthy();
    expect(screen.queryByText(texts.rankPending)).toBeNull();
    await fireEvent.press(screen.getByTestId('career-step-specialties'));
    expect(props.onSpecialties).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: texts.workplaces.leave }));
    // Confirmation sheet first, then the backend's answer.
    const buttons = screen.getAllByRole('button', { name: texts.workplaces.leave });
    await fireEvent.press(buttons[buttons.length - 1]!);
    expect(await screen.findByText(texts.workplaces.hasBookings)).toBeTruthy();
  });
});

describe('CareerProfileFormScreen', () => {
  it('creates the profile and renews the session to get the barber role', async () => {
    await tokenStorage.setRefreshToken('refresh-0');
    const api = mockApi({
      'POST /api/v1/auth/refresh': { body: tokens({ roles: ['CLIENT', 'BARBER'] }) },
      'GET /api/v1/me/barber-profile': apiError(404, 'NOT_FOUND'),
      'PUT /api/v1/me/barber-profile': { body: profile() },
    });
    const onSaved = jest.fn();
    await renderWithProviders(<CareerProfileFormScreen onSaved={onSaved} />);
    await fireEvent.changeText(await screen.findByLabelText(texts.form.displayName), 'Julián');
    await fireEvent.changeText(screen.getByLabelText(texts.form.years), '4');
    await fireEvent.press(screen.getByRole('button', { name: texts.form.create }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(api.calls.find((c) => c.method === 'PUT')!.body).toMatchObject({
      displayName: 'Julián',
      yearsExperience: 4,
      headline: null,
      availableForWork: false,
    });
    expect(api.calls.some((c) => c.path === '/api/v1/auth/refresh')).toBe(true);
  });
});

describe('PublicCareerProfileScreen', () => {
  it('shows the career and where the barber works', async () => {
    mockApi({
      'GET /api/v1/barber-profiles/{id}': { body: profile({ rank: 3, ratingAverage: 4.8, ratingCount: 10 }) },
      'GET /api/v1/barber-profiles/{id}/portfolio': { body: emptyPage },
      'GET /api/v1/barber-profiles/{id}/reviews': { body: emptyPage },
      'GET /api/v1/service-styles': { body: [] },
    });
    const onOpenShop = jest.fn();
    await renderWithProviders(<PublicCareerProfileScreen id="bp1" onOpenShop={onOpenShop} />);
    expect(await screen.findByText('Puesto #3 en el ranking')).toBeTruthy();
    await fireEvent.press(screen.getByText('Barbería Demo'));
    expect(onOpenShop).toHaveBeenCalledWith('shop-1');
  });
});

describe('RankingScreen', () => {
  it('pages by offset and shows the ones not ranked yet', async () => {
    const api = mockApi({
      'GET /api/v1/service-styles': { body: [] },
      'GET /api/v1/barbers/ranking': {
        body: {
          items: [
            {
              id: 'bp1',
              rank: 1,
              displayName: 'Julián',
              headline: null,
              photoUrl: null,
              district: 'Miraflores',
              ratingAverage: 4.9,
              ratingCount: 20,
              attendedCount: 40,
              score: 4.7,
              availableForWork: true,
              specialties: [],
              currentBarbershops: ['Barbería Demo'],
            },
            {
              id: 'bp2',
              rank: null,
              displayName: 'Nuevo Barbero',
              headline: null,
              photoUrl: null,
              district: null,
              ratingAverage: null,
              ratingCount: 0,
              attendedCount: 0,
              score: 0,
              availableForWork: true,
              specialties: [],
              currentBarbershops: [],
            },
          ],
          nextOffset: null,
        },
      },
    });
    await renderWithProviders(<RankingScreen availableOnly onOpen={jest.fn()} />);
    expect(await screen.findByText('#1 Julián')).toBeTruthy();
    expect(screen.getByText(texts.newTalent)).toBeTruthy();
    const call = api.calls.find((c) => c.path === '/api/v1/barbers/ranking')!;
    expect(call).toBeTruthy();
    await waitFor(() => expect(api.fetchMock).toHaveBeenCalled());
  });
});
