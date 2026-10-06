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
      body: text ? JSON.parse(text) : undefined,
    });
    const handler = routes[`${request.method} ${path}` as keyof typeof routes];
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
    preferences: { notificationChannels: ['EMAIL', 'IN_APP'] },
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) satisfies components['schemas']['ProfileDto'];
