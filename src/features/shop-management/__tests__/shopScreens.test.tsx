import { Text } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { apiError, barbershop, businessHours, mockApi, tokens } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import type { components } from '@/shared/api';
import { tokenStorage } from '@/shared/api/tokenStorage';
import texts from '@/shared/i18n/locales/es/shop.json';
import { InvitationsScreen, ScheduleScreen, ServicesScreen, ShopHomeScreen, TimeBlockFormScreen } from '..';

type S = components['schemas'];

const myShop = (overrides: Partial<S['MyBarbershopDto']> = {}): S['MyBarbershopDto'] => ({
  id: 's1',
  name: 'Barbería Demo Miraflores',
  myRole: 'OWNER',
  status: 'OPEN',
  type: 'BARBERSHOP',
  ...overrides,
});

const managedService = (overrides: Partial<S['ServiceManageDto']> = {}): S['ServiceManageDto'] => ({
  id: 'sv1',
  name: 'Corte clásico',
  description: null,
  durationMinutes: 30,
  isAvailable: true,
  barberIds: ['b1', 'b2'],
  category: { key: 'haircut', name: 'Corte' } as S['ServiceCategoryDto'],
  price: { amount: 2550, currency: 'PEN' },
  ...overrides,
});

const managedShop = (overrides: Partial<S['BarbershopManageDto']> = {}) =>
  ({
    ...barbershop(),
    id: 's1',
    ruc: null,
    closure: null,
    myRole: 'OWNER',
    status: 'OPEN',
    ...overrides,
  }) as S['BarbershopManageDto'];

const homeProps = {
  onCreate: jest.fn(),
  onInvitations: jest.fn(),
  onOpen: jest.fn(),
  onOpenAsBarber: jest.fn(),
};

beforeEach(async () => {
  resetAppState();
  signIn({ roles: ['CLIENT', 'OWNER'] });
  await tokenStorage.setRefreshToken('refresh-0');
});

describe('ShopHomeScreen', () => {
  it('offers to create a barbershop when the account manages none', async () => {
    mockApi({
      'GET /api/v1/me/barbershops': { body: { items: [], nextCursor: null } },
      'GET /api/v1/me/barber': { body: { items: [] } },
    });
    await renderWithProviders(<ShopHomeScreen {...homeProps} />);
    expect(await screen.findByText(texts.home.emptyTitle)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: texts.home.create }));
    expect(homeProps.onCreate).toHaveBeenCalled();
  });

  it('puts the job board first for a barber without a barbershop', async () => {
    mockApi({
      'GET /api/v1/me/barbershops': { body: { items: [], nextCursor: null } },
      'GET /api/v1/me/barber': { body: { items: [] } },
    });
    const jobBoardSlot = jest.fn((variant: string) => <Text>{`board-${variant}`}</Text>);
    await renderWithProviders(<ShopHomeScreen {...homeProps} jobBoardSlot={jobBoardSlot} />);
    expect(await screen.findByText('board-primary')).toBeTruthy();
    expect(screen.getByText(texts.home.ownShopTitle)).toBeTruthy();
    expect(screen.queryByText(texts.home.emptyTitle)).toBeNull();
  });

  it('shows the managed barbershop and opens its sections', async () => {
    mockApi({
      'GET /api/v1/me/barbershops': {
        body: { items: [myShop({ status: 'PENDING_REVIEW' })], nextCursor: null },
      },
      'GET /api/v1/me/barbershops/{id}': { body: managedShop({ status: 'PENDING_REVIEW' }) },
      'GET /api/v1/me/barber': { body: { items: [] } },
    });
    await renderWithProviders(<ShopHomeScreen {...homeProps} />);
    expect(await screen.findByText('Barbería Demo Miraflores')).toBeTruthy();
    expect(screen.getByText(texts.home.pendingReview)).toBeTruthy();
    await fireEvent.press(screen.getByText(texts.home.sections.services));
    expect(homeProps.onOpen).toHaveBeenCalledWith('s1', 'services');
  });

  it('shows an error with retry when the list fails', async () => {
    mockApi({
      'GET /api/v1/me/barbershops': apiError(500, 'INTERNAL_ERROR'),
      'GET /api/v1/me/barber': { body: { items: [] } },
    });
    await renderWithProviders(<ShopHomeScreen {...homeProps} />);
    expect(await screen.findByRole('button', { name: /reintentar/i })).toBeTruthy();
  });
});

describe('ServicesScreen', () => {
  it('lists the services with the price the API gives', async () => {
    mockApi({
      'GET /api/v1/me/barbershops/{id}/services': { body: { items: [managedService()], nextCursor: null } },
    });
    await renderWithProviders(<ServicesScreen shopId="s1" onNew={jest.fn()} onEdit={jest.fn()} />);
    expect(await screen.findByText('Corte clásico')).toBeTruthy();
    expect(screen.getByText(/S\/\s?25[.,]50/)).toBeTruthy();
  });

  it('explains the empty list', async () => {
    mockApi({ 'GET /api/v1/me/barbershops/{id}/services': { body: { items: [], nextCursor: null } } });
    await renderWithProviders(<ServicesScreen shopId="s1" onNew={jest.fn()} onEdit={jest.fn()} />);
    expect(await screen.findByText(texts.services.empty)).toBeTruthy();
  });
});

describe('ScheduleScreen', () => {
  it('saves the week as the API expects and reports bookings left outside', async () => {
    const api = mockApi({
      'GET /api/v1/barbershops/{id}/business-hours': { body: businessHours() },
      'PUT /api/v1/barbershops/{id}/business-hours': {
        body: { ...businessHours(), bookingsOutsideSchedule: 2 },
      },
    });
    await renderWithProviders(<ScheduleScreen shopId="s1" />);
    await fireEvent.press(await screen.findByRole('button', { name: texts.hours.save }));
    expect(await screen.findByText(/2 reservas futuras quedan fuera/)).toBeTruthy();
    const put = api.calls.find((c) => c.method === 'PUT');
    expect(put?.body).toEqual({ days: businessHours().days });
  });
});

describe('TimeBlockFormScreen', () => {
  it('explains a block that overlaps active bookings', async () => {
    mockApi({
      'GET /api/v1/me/barbershops/{id}/barbers': { body: { items: [], nextCursor: null } },
      'GET /api/v1/barbershops/{id}/time-blocks': { body: { items: [], nextCursor: null } },
      'POST /api/v1/barbershops/{id}/time-blocks': apiError(409, 'BLOCK_OVERLAPS_BOOKINGS', [{ count: 3 }]),
    });
    await renderWithProviders(<TimeBlockFormScreen shopId="s1" timeZone="America/Lima" onDone={jest.fn()} />);
    await fireEvent.press(await screen.findByRole('button', { name: texts.blocks.save }));
    expect(await screen.findByText(/choca con 3 reservas activas/)).toBeTruthy();
  });
});

describe('InvitationsScreen', () => {
  const invitation: S['InvitationDto'] = {
    id: 'inv1',
    kind: 'BARBER',
    barberDisplayName: 'Charly',
    barbershopId: 's1',
    barbershopName: 'Barbería Demo Miraflores',
    memberRole: null,
    expiresAt: '2030-01-10T15:00:00.000Z',
  };

  it('accepts with the emailed code and renews the session to get the new role', async () => {
    const api = mockApi({
      'GET /api/v1/me/barbershop-invitations': { body: { items: [invitation], nextCursor: null } },
      'POST /api/v1/me/barbershop-invitations/{invitationId}/accept': { status: 204 },
      'POST /api/v1/auth/refresh': { body: tokens({ roles: ['CLIENT', 'BARBER'] }) },
    });
    await renderWithProviders(<InvitationsScreen />);
    await fireEvent.changeText(await screen.findByLabelText(texts.invitations.code), '123456');
    await fireEvent.press(screen.getByRole('button', { name: texts.invitations.accept }));
    expect(await screen.findByText(/Ya formas parte de Barbería Demo Miraflores/)).toBeTruthy();
    const accept = api.calls.find((c) => c.path.endsWith('/accept'));
    expect(accept?.body).toEqual({ code: '123456' });
    await waitFor(() => expect(api.callsTo('POST', '/api/v1/auth/refresh')).toHaveLength(1));
  });

  it('shows the empty state', async () => {
    mockApi({ 'GET /api/v1/me/barbershop-invitations': { body: { items: [], nextCursor: null } } });
    await renderWithProviders(<InvitationsScreen />);
    expect(await screen.findByText(texts.invitations.empty)).toBeTruthy();
  });
});
