import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { apiError, barbershop, mockApi, tokens } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import type { components } from '@/shared/api';
import { tokenStorage } from '@/shared/api/tokenStorage';
import texts from '@/shared/i18n/locales/es/shop.json';
import { CreateShopScreen, EditShopScreen, ShopReviewScreen } from '..';
import { ownerDocumentError } from '../schemas/ownerDocument';

jest.mock('expo-location', () => ({
  PermissionStatus: { GRANTED: 'granted', UNDETERMINED: 'undetermined', DENIED: 'denied' },
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

type S = components['schemas'];
const location = Location as jest.Mocked<typeof Location>;

const managedShop = (overrides: Partial<S['BarbershopManageDto']> = {}) =>
  ({
    ...barbershop(),
    id: 's1',
    phone: '+51 1 234 5678',
    closure: null,
    ownerDocument: null,
    myRole: 'OWNER',
    status: 'DRAFT',
    ...overrides,
  }) as S['BarbershopManageDto'];

const review = (overrides: Partial<S['BarbershopReviewDto']> = {}): S['BarbershopReviewDto'] => ({
  status: 'DRAFT',
  missingRequirements: [],
  canSubmit: true,
  reviewNotes: null,
  submittedAt: null,
  submissions: [],
  ...overrides,
});

beforeEach(async () => {
  resetAppState();
  jest.clearAllMocks();
  signIn({ roles: ['CLIENT'] });
  await tokenStorage.setRefreshToken('refresh-0');
  location.getForegroundPermissionsAsync.mockResolvedValue({ status: 'granted', granted: true } as never);
  location.getCurrentPositionAsync.mockResolvedValue({
    coords: { latitude: -12.11, longitude: -77.03 },
  } as never);
});

describe('ownerDocumentError (examples from the backend)', () => {
  it.each([
    ['RUC', '20100047218', null],
    ['RUC', '20.100.047-218', null],
    ['RUC', '20100047219', 'document.rucInvalid'],
    ['RUC', '30100047218', 'document.rucInvalid'],
    ['RUC', '2010004721', 'document.lengthRUC'],
    ['DNI', '12345678', null],
    ['DNI', '1234567', 'document.lengthDNI'],
  ] as const)('%s %s', (type, number, expected) => {
    expect(ownerDocumentError(type, number)).toBe(expected);
  });
});

async function fillCreateForm() {
  await fireEvent.changeText(screen.getByLabelText(texts.form.name), 'Barbería Nueva');
  await fireEvent.changeText(screen.getByLabelText(texts.form.address), 'Av. Larco 123');
  await fireEvent.changeText(screen.getByLabelText(texts.form.phone), '+51 1 234 5678');
  await fireEvent.press(screen.getByRole('button', { name: texts.form.useMyLocation }));
  await screen.findByText(texts.form.locationSet);
}

describe('CreateShopScreen', () => {
  const created = { body: { ...managedShop(), ownerRoleGranted: true } };

  it('omits the document when it is left empty (never sends ruc or null)', async () => {
    const api = mockApi({
      'POST /api/v1/barbershops': { status: 201, ...created },
      'POST /api/v1/auth/refresh': { body: tokens({ roles: ['CLIENT', 'OWNER'] }) },
    });
    const onDone = jest.fn();
    await renderWithProviders(<CreateShopScreen onDone={onDone} />);
    await fillCreateForm();
    await fireEvent.press(screen.getByRole('button', { name: texts.form.submitCreate }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('s1'));
    const body = api.calls.find((c) => c.path === '/api/v1/barbershops')?.body as Record<string, unknown>;
    expect(body).not.toHaveProperty('ruc');
    expect(body).not.toHaveProperty('ownerDocument');
    expect(api.calls.some((c) => c.path === '/api/v1/auth/refresh')).toBe(true);
  });

  it('sends a valid RUC with digits only', async () => {
    const api = mockApi({
      'POST /api/v1/barbershops': { status: 201, ...created },
      'POST /api/v1/auth/refresh': { body: tokens({ roles: ['CLIENT', 'OWNER'] }) },
    });
    await renderWithProviders(<CreateShopScreen onDone={jest.fn()} />);
    await fillCreateForm();
    await fireEvent.changeText(screen.getByLabelText(texts.document.number), '20.100.047-218');
    await fireEvent.press(screen.getByRole('button', { name: texts.form.submitCreate }));
    await waitFor(() => expect(api.calls.some((c) => c.path === '/api/v1/barbershops')).toBe(true));
    const body = api.calls.find((c) => c.path === '/api/v1/barbershops')?.body as Record<string, unknown>;
    expect(body.ownerDocument).toEqual({ type: 'RUC', number: '20100047218' });
  });

  it('marks an invalid RUC next to the field without calling the API', async () => {
    const api = mockApi({});
    await renderWithProviders(<CreateShopScreen onDone={jest.fn()} />);
    await fillCreateForm();
    await fireEvent.changeText(screen.getByLabelText(texts.document.number), '20100047219');
    await fireEvent.press(screen.getByRole('button', { name: texts.form.submitCreate }));
    expect(await screen.findByText(texts.document.rucInvalid)).toBeTruthy();
    expect(api.calls).toHaveLength(0);
  });

  it('puts the backend document error next to the field', async () => {
    mockApi({
      'POST /api/v1/barbershops': apiError(400, 'VALIDATION_ERROR', [
        { field: 'ownerDocument.number', constraints: ['ownerDocument'] },
      ]),
    });
    await renderWithProviders(<CreateShopScreen onDone={jest.fn()} />);
    await fillCreateForm();
    await fireEvent.changeText(screen.getByLabelText(texts.document.number), '20100047218');
    await fireEvent.press(screen.getByRole('button', { name: texts.form.submitCreate }));
    expect(await screen.findByText(texts.document.serverInvalid)).toBeTruthy();
  });
});

describe('EditShopScreen', () => {
  it('shows the masked document to the owner and changes it with its own endpoint', async () => {
    const api = mockApi({
      'GET /api/v1/me/barbershops/{id}': {
        body: managedShop({ ownerDocument: { type: 'RUC', masked: '********218' } }),
      },
      'PATCH /api/v1/barbershops/{id}': { body: managedShop() },
      'PUT /api/v1/barbershops/{id}/owner-document': { body: managedShop() },
    });
    await renderWithProviders(<EditShopScreen shopId="s1" onDone={jest.fn()} />);
    expect(await screen.findByText(/RUC \*{8}218/)).toBeTruthy();
    await fireEvent.press(screen.getByText(texts.document.DNI));
    await fireEvent.changeText(screen.getByLabelText(texts.document.newNumber), '12345678');
    await fireEvent.press(screen.getByRole('button', { name: texts.form.submitSave }));
    await waitFor(() => expect(api.calls.some((c) => c.method === 'PUT')).toBe(true));
    const patch = api.calls.find((c) => c.method === 'PATCH')?.body as Record<string, unknown>;
    expect(patch).not.toHaveProperty('ownerDocument');
    expect(api.calls.find((c) => c.method === 'PUT')?.body).toEqual({ type: 'DNI', number: '12345678' });
  });

  it('hides the document from a manager', async () => {
    mockApi({ 'GET /api/v1/me/barbershops/{id}': { body: managedShop({ myRole: 'MANAGER' }) } });
    await renderWithProviders(<EditShopScreen shopId="s1" onDone={jest.fn()} />);
    expect(await screen.findByDisplayValue(barbershop().name)).toBeTruthy();
    expect(screen.queryByText(texts.document.title)).toBeNull();
  });
});

describe('ShopReviewScreen', () => {
  it('lists what is missing and keeps the submit disabled as the API says', async () => {
    mockApi({
      'GET /api/v1/me/barbershops/{id}': { body: managedShop() },
      'GET /api/v1/barbershops/{id}/review': {
        body: review({ missingRequirements: ['OWNER_DOCUMENT'], canSubmit: false }),
      },
    });
    const onEditDetails = jest.fn();
    await renderWithProviders(<ShopReviewScreen shopId="s1" onEditDetails={onEditDetails} />);
    expect(await screen.findByText(texts.review.requirement.OWNER_DOCUMENT)).toBeTruthy();
    expect(screen.getByRole('button', { name: texts.review.submit })).toBeDisabled();
    await fireEvent.press(screen.getByText(texts.review.requirement.OWNER_DOCUMENT));
    expect(onEditDetails).toHaveBeenCalled();
  });

  it('sends it to review', async () => {
    const api = mockApi({
      'GET /api/v1/me/barbershops/{id}': { body: managedShop() },
      'GET /api/v1/barbershops/{id}/review': { body: review() },
      'POST /api/v1/barbershops/{id}/review/submit': { body: review({ status: 'PENDING_REVIEW' }) },
    });
    await renderWithProviders(<ShopReviewScreen shopId="s1" onEditDetails={jest.fn()} />);
    await fireEvent.press(await screen.findByRole('button', { name: texts.review.submit }));
    expect(await screen.findByText(texts.review.sent)).toBeTruthy();
    expect(api.calls.some((c) => c.path.endsWith('/review/submit'))).toBe(true);
  });

  it('shows what is missing when the backend rejects the submit', async () => {
    mockApi({
      'GET /api/v1/me/barbershops/{id}': { body: managedShop() },
      'GET /api/v1/barbershops/{id}/review': { body: review() },
      'POST /api/v1/barbershops/{id}/review/submit': apiError(409, 'REVIEW_REQUIREMENTS_MISSING', [
        { requirement: 'OWNER_DOCUMENT' },
      ]),
    });
    await renderWithProviders(<ShopReviewScreen shopId="s1" onEditDetails={jest.fn()} />);
    await fireEvent.press(await screen.findByRole('button', { name: texts.review.submit }));
    expect(await screen.findByText(texts.review.requirement.OWNER_DOCUMENT)).toBeTruthy();
  });

  it('shows the support notes when changes were requested', async () => {
    mockApi({
      'GET /api/v1/me/barbershops/{id}': { body: managedShop({ status: 'CHANGES_REQUESTED' }) },
      'GET /api/v1/barbershops/{id}/review': {
        body: review({ status: 'CHANGES_REQUESTED', reviewNotes: 'La dirección no coincide.' }),
      },
    });
    await renderWithProviders(<ShopReviewScreen shopId="s1" onEditDetails={jest.fn()} />);
    expect(await screen.findByText('La dirección no coincide.')).toBeTruthy();
    expect(screen.getByRole('button', { name: texts.review.resubmit })).toBeTruthy();
  });

  it('tells a manager that only the owner can send it', async () => {
    mockApi({
      'GET /api/v1/me/barbershops/{id}': { body: managedShop({ myRole: 'MANAGER' }) },
      'GET /api/v1/barbershops/{id}/review': { body: review() },
    });
    await renderWithProviders(<ShopReviewScreen shopId="s1" onEditDetails={jest.fn()} />);
    expect(await screen.findByText(texts.review.ownerOnly)).toBeTruthy();
    expect(screen.queryByRole('button', { name: texts.review.submit })).toBeNull();
  });
});
