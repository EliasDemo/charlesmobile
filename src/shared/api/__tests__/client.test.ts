import { onlineManager } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react-native';
import { ApiError } from '../errors';
import type { components } from '../generated/schema';
import { api, unwrap } from '../client';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('node:crypto').randomUUID() }));
import { newIdempotencyKey } from '../idempotency';
import { createQueryClient, startQueryListeners } from '../queryClient';
import { startSession, useSession } from '../session';
import { useIsOnline } from '../useIsOnline';

type Health = components['schemas']['HealthResponseDto'];

const health: Health = { status: 'ok', checks: { database: 'up', redis: 'up' } };

const fetchMock = jest.fn<Promise<Response>, [Request]>();
beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  useSession.setState({ status: 'anonymous', accessToken: null, user: null });
});

describe('api client', () => {
  it('calls the backend origin with the contract path and returns typed data', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(health), { status: 200 }));
    await expect(unwrap(api.GET('/api/v1/health'))).resolves.toEqual(health);
    const request = fetchMock.mock.calls[0]![0];
    expect(request.url).toBe('http://api.test/api/v1/health');
    expect(request.headers.get('X-App-Platform')).toBeTruthy();
  });

  it('throws an ApiError built from the error body', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 'NOT_FOUND', message: 'x', details: [], requestId: 'r1' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const promise = unwrap(api.GET('/api/v1/barbershops/{id}', { params: { path: { id: 'x' } } }));
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(
      unwrap(Promise.resolve({ error: 'bad', response: new Response(null, { status: 500 }) })),
    ).rejects.toMatchObject({ code: 'UNKNOWN' });
  });

  it('throws when a successful response has no body', async () => {
    await expect(
      unwrap(Promise.resolve({ response: new Response(null, { status: 200 }) })),
    ).rejects.toBeInstanceOf(ApiError);
    await expect(
      unwrap(Promise.resolve({ response: new Response(null, { status: 204 }) })),
    ).resolves.toBeUndefined();
  });

  it('renews through POST /auth/refresh and ends the session when it is rejected', async () => {
    await startSession({
      tokenType: 'Bearer',
      accessToken: 'a',
      accessTokenExpiresAt: '2030-01-01T00:00:00.000Z',
      refreshToken: 'r',
      refreshTokenExpiresAt: '2030-01-01T00:00:00.000Z',
      user: { id: 'u', fullName: 'Ana', username: 'ana', emailVerified: true, roles: ['CLIENT'] },
    });
    const unauthorized = (code: string) =>
      new Response(JSON.stringify({ code, message: 'x', details: [], requestId: 'r' }), { status: 401 });
    fetchMock.mockResolvedValueOnce(unauthorized('UNAUTHORIZED'));
    fetchMock.mockResolvedValueOnce(unauthorized('INVALID_REFRESH_TOKEN'));

    await expect(unwrap(api.GET('/api/v1/users/me'))).rejects.toMatchObject({ status: 401 });

    const refreshCall = fetchMock.mock.calls[1]![0];
    expect(refreshCall.url).toBe('http://api.test/api/v1/auth/refresh');
    expect(refreshCall.headers.has('Authorization')).toBe(false);
    expect(await refreshCall.json()).toEqual({ refreshToken: 'r' });
    expect(useSession.getState().status).toBe('anonymous');
  });
});

describe('idempotency keys', () => {
  it('creates a different UUID per attempt', () => {
    const a = newIdempotencyKey();
    expect(a).toMatch(/^[0-9a-f-]{36}$/i);
    expect(newIdempotencyKey()).not.toBe(a);
  });
});

describe('query client', () => {
  it('never retries API errors and retries other failures once', () => {
    const retry = createQueryClient().getDefaultOptions().queries?.retry as (
      n: number,
      e: unknown,
    ) => boolean;
    expect(retry(0, new ApiError(404, null))).toBe(false);
    expect(retry(0, new Error('network'))).toBe(true);
    expect(retry(1, new Error('network'))).toBe(false);
  });
});

describe('startQueryListeners', () => {
  it('connects connectivity and app state once', () => {
    const { AppState } = require('react-native') as typeof import('react-native');
    const appStateSpy = jest.spyOn(AppState, 'addEventListener');
    startQueryListeners();
    startQueryListeners();
    expect(appStateSpy).toHaveBeenCalledTimes(1);
  });
});

describe('useIsOnline', () => {
  it('follows the connectivity state', async () => {
    const { result } = await renderHook(() => useIsOnline());
    expect(result.current).toBe(true);
    await act(async () => onlineManager.setOnline(false));
    expect(result.current).toBe(false);
    await act(async () => onlineManager.setOnline(true));
  });
});
