import type { components, paths } from '@/shared/api';

type ApiPath = keyof paths & string;
type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface MockReply {
  status?: number;
  body?: unknown;
}

type Handler = MockReply | ((request: Request) => MockReply | Promise<MockReply>);

export interface RecordedCall {
  method: string;
  path: string;
  headers: Headers;
  body: unknown;
}

/** Error body with the backend's standard shape. */
export const apiError = (
  status: number,
  code: string,
  details: Record<string, unknown>[] = [],
): MockReply => ({
  status,
  body: { code, message: 'texto del backend', details, requestId: 'req-test' } satisfies Omit<
    components['schemas']['ErrorResponseDto'],
    'details'
  > & { details: unknown[] },
});

/** JSON bodies are parsed; anything else (multipart uploads) is kept as text. */
function parseBody(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Matches "GET /api/v1/barbershops/{id}" against a real path, as the contract writes it. */
function findHandler(routes: Record<string, Handler>, method: string, path: string): Handler | undefined {
  for (const [key, handler] of Object.entries(routes)) {
    const [routeMethod, template] = key.split(' ') as [string, string];
    if (routeMethod !== method) continue;
    const pattern = new RegExp(`^${template.replace(/\{[^/]+\}/g, '[^/]+')}$`);
    if (pattern.test(path)) return handler;
  }
  return undefined;
}

/**
 * Replaces global fetch with handlers keyed by "METHOD /api/v1/path" (paths from the generated
 * contract). Unknown routes answer 404. Returns the calls for assertions.
 */
export function mockApi(routes: Partial<Record<`${Method} ${ApiPath}`, Handler>>) {
  const calls: RecordedCall[] = [];
  const fetchMock = jest.fn(async (request: Request) => {
    const path = new URL(request.url).pathname;
    const text = await request.clone().text();
    calls.push({
      method: request.method,
      path,
      headers: request.headers,
      body: text ? parseBody(text) : undefined,
    });
    const handler = findHandler(routes as Record<string, Handler>, request.method, path);
    const reply: MockReply = handler
      ? typeof handler === 'function'
        ? await handler(request)
        : handler
      : apiError(404, 'NOT_FOUND');
    const status = reply.status ?? 200;
    return new Response(reply.body === undefined || status === 204 ? null : JSON.stringify(reply.body), {
      status,
      headers: { 'Content-Type': 'application/json', 'X-Request-Id': 'req-test' },
    });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return {
    calls,
    fetchMock,
    callsTo: (method: Method, path: ApiPath) => calls.filter((c) => c.method === method && c.path === path),
  };
}

export const tokens = (overrides: Partial<components['schemas']['SessionUserDto']> = {}) =>
  ({
    tokenType: 'Bearer',
    accessToken: 'access-1',
    accessTokenExpiresAt: '2030-01-01T00:15:00.000Z',
    refreshToken: 'refresh-1',
    refreshTokenExpiresAt: '2030-01-31T00:00:00.000Z',
    user: { id: 'u1', fullName: 'Ana Pérez', emailVerified: true, roles: ['CLIENT'], ...overrides },
  }) satisfies components['schemas']['AuthTokensDto'];

export const profile = (overrides: Partial<components['schemas']['ProfileDto']> = {}) =>
  ({
    id: 'u1',
    fullName: 'Ana Pérez',
    email: 'ana@example.com',
    emailVerified: true,
    phone: '+51 987 654 321',
    roles: ['CLIENT'],
    preferences: { notificationChannels: ['EMAIL', 'IN_APP'], reminders: false },
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) satisfies components['schemas']['ProfileDto'];

type Schemas = components['schemas'];
const SHOP_ID = '01990000-0000-7000-8000-000000000065';

export const searchResult = (
  overrides: Partial<Schemas['SearchResultDto']> = {},
): Schemas['SearchResultDto'] => ({
  id: SHOP_ID,
  logoUrl: null,
  coverThumbUrl: null,
  name: 'Barbería Demo Miraflores',
  type: 'BARBERSHOP',
  status: 'OPEN',
  address: 'Av. Ejemplo 123, Miraflores, Lima',
  latitude: -12.1211,
  longitude: -77.0297,
  rating: { average: 4.5, count: 12 },
  distanceMeters: null,
  priceFrom: { amount: 2000, currency: 'PEN' },
  isOpenNow: true,
  availableNow: false,
  featured: false,
  timezone: 'America/Lima',
  isFavorite: false,
  ...overrides,
});

export const searchPage = (
  items: Schemas['SearchResultDto'][],
  nextCursor: string | null = null,
  evaluationLimitReached = false,
): Schemas['SearchPageDto'] => ({ items, nextCursor, evaluationLimitReached });

export const barbershop = (
  overrides: Partial<Schemas['BarbershopPublicDto']> = {},
): Schemas['BarbershopPublicDto'] => ({
  id: SHOP_ID,
  logoUrl: null,
  coverUrl: null,
  coverThumbUrl: null,
  name: 'Barbería Demo Miraflores',
  description: null,
  address: 'Av. Ejemplo 123, Miraflores, Lima',
  latitude: -12.1211,
  longitude: -77.0297,
  timezone: 'America/Lima',
  type: 'BARBERSHOP',
  phone: null,
  status: 'OPEN',
  closure: null,
  links: { website: null, instagram: null, facebook: null },
  rating: { average: 4.5, count: 12 },
  isFavorite: false,
  ...overrides,
});

export const service = (
  overrides: Partial<Schemas['ServicePublicDto']> = {},
): Schemas['ServicePublicDto'] => ({
  id: '01990000-0000-7000-8000-00000000012d',
  name: 'Corte clásico',
  description: null,
  price: { amount: 2500, currency: 'PEN' },
  durationMinutes: 30,
  category: { key: 'haircut', name: 'Corte de cabello' },
  ...overrides,
});

export const barber = (overrides: Partial<Schemas['BarberPublicDto']> = {}): Schemas['BarberPublicDto'] => ({
  id: '01990000-0000-7000-8000-0000000000ca',
  yearsExperience: null,
  specialties: [],
  displayName: 'Barbero Demo',
  bio: null,
  photoUrl: null,
  serviceIds: [],
  rating: { average: 4.8, count: 5 },
  ...overrides,
});

export const businessHours = (): Schemas['BusinessHoursDto'] => ({
  timezone: 'America/Lima',
  isOpenNow: true,
  days: [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    windows: [
      { start: '09:00', end: '13:00' },
      { start: '14:00', end: '20:00' },
    ],
  })),
});

export const review = (overrides: Partial<Schemas['PublicReviewDto']> = {}): Schemas['PublicReviewDto'] => ({
  id: 'r1',
  rating: 5,
  comment: 'Excelente corte',
  authorName: 'Ana R.',
  serviceName: 'Corte clásico',
  barber: { id: '01990000-0000-7000-8000-0000000000ca', displayName: 'Barbero Demo' },
  createdAt: '2030-01-07T14:00:00.000Z',
  editedAt: null,
  response: null,
  ...overrides,
});

export const favorite = (overrides: Partial<Schemas['FavoriteDto']> = {}): Schemas['FavoriteDto'] => ({
  barbershopId: SHOP_ID,
  name: 'Barbería Demo Miraflores',
  address: 'Av. Ejemplo 123, Miraflores, Lima',
  type: 'BARBERSHOP',
  status: 'OPEN',
  rating: { average: 4.5, count: 12 },
  favoritedAt: '2030-01-07T14:00:00.000Z',
  ...overrides,
});

export const categories = (): Schemas['ServiceCategoryListDto'] => ({
  items: [
    { key: 'haircut', name: 'Corte de cabello' },
    { key: 'beard', name: 'Barba' },
  ],
});

export const booking = (overrides: Partial<Schemas['BookingDto']> = {}): Schemas['BookingDto'] => ({
  id: 'bk-1',
  canReview: false,
  review: null,
  commission: null,
  status: 'PENDING_PAYMENT',
  barbershop: { id: SHOP_ID, name: 'Barbería Demo Miraflores', timezone: 'America/Lima' },
  service: { id: '01990000-0000-7000-8000-00000000012d', name: 'Corte clásico', categoryKey: 'haircut' },
  barber: { id: '01990000-0000-7000-8000-0000000000ca', name: 'Barbero Demo' },
  barberChosenByClient: false,
  client: null,
  startAt: '2030-01-07T14:00:00.000Z',
  endAt: '2030-01-07T14:30:00.000Z',
  durationMinutes: 30,
  price: {
    subtotal: { amount: 2500, currency: 'PEN' },
    discountTotal: { amount: 0, currency: 'PEN' },
    feeTotal: { amount: 0, currency: 'PEN' },
    total: { amount: 2500, currency: 'PEN' },
    lines: [{ type: 'SERVICE', description: 'Corte clásico', amount: { amount: 2500, currency: 'PEN' } }],
  },
  expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  cancellation: null,
  createdAt: '2030-01-01T00:00:00.000Z',
  ...overrides,
});

export const createdBooking = (
  overrides: Partial<Schemas['BookingDto']> = {},
): Schemas['CreatedBookingDto'] => ({
  ...booking(overrides),
  payment: {
    paymentId: 'pay-1',
    provider: 'FAKE',
    status: 'PENDING',
    amount: { amount: 2500, currency: 'PEN' },
    clientAction: { type: 'FAKE', data: { paymentId: 'pay-1' } },
  },
});

export const cancellationPreview = (
  overrides: Partial<Schemas['CancellationPreviewDto']> = {},
): Schemas['CancellationPreviewDto'] => ({
  allowed: true,
  reason: null,
  reasonRequired: false,
  refund: {
    amount: { amount: 2500, currency: 'PEN' },
    percent: 100,
    rule: 'CLIENT_FULL',
    paid: { amount: 2500, currency: 'PEN' },
  },
  ...overrides,
});

export const daySlots = (date = '2030-01-07', startAts: string[] = []): Schemas['DayAvailabilityDto'] => ({
  date,
  timezone: 'America/Lima',
  slots: startAts.map((startAt) => ({
    startAt,
    endAt: new Date(Date.parse(startAt) + 30 * 60 * 1000).toISOString(),
    barberIds: ['01990000-0000-7000-8000-0000000000ca'],
  })),
});
