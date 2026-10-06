import * as SecureStore from 'expo-secure-store';
import { NetworkError } from '../errors';
import type { components } from '../generated/schema';
import {
  bootstrapSession,
  clearSession,
  configureRefresh,
  onSessionEnded,
  refreshSession,
  startSession,
  useSession,
} from '../session';
import { tokenStorage } from '../tokenStorage';

type AuthTokens = components['schemas']['AuthTokensDto'];

const tokens = (n: number): AuthTokens => ({
  tokenType: 'Bearer',
  accessToken: `access-${n}`,
  accessTokenExpiresAt: '2030-01-01T00:15:00.000Z',
  refreshToken: `refresh-${n}`,
  refreshTokenExpiresAt: '2030-01-31T00:00:00.000Z',
  user: { id: 'u1', fullName: 'Ana', emailVerified: true, roles: ['CLIENT'] },
});

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const invalidRefresh = () =>
  new Response(JSON.stringify({ code: 'INVALID_REFRESH_TOKEN', message: 'x', details: [], requestId: 'r' }), {
    status: 401,
  });

beforeEach(async () => {
  (SecureStore as unknown as { __store: Map<string, string> }).__store.clear();
  useSession.setState({ status: 'unknown', accessToken: null, user: null });
});

describe('refreshSession', () => {
  it('renews only once when many requests ask at the same time (single flight)', async () => {
    await tokenStorage.setRefreshToken('refresh-0');
    let resolve!: (r: Response) => void;
    const request = jest.fn(() => new Promise<Response>((r) => (resolve = r)));
    configureRefresh(request);

    const calls = [refreshSession(), refreshSession(), refreshSession()];
    await Promise.resolve();
    await Promise.resolve();
    resolve(ok(tokens(1)));

    await expect(Promise.all(calls)).resolves.toEqual(['access-1', 'access-1', 'access-1']);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith('refresh-0');
  });

  it('stores the rotated refresh token and keeps the access token in memory', async () => {
    await tokenStorage.setRefreshToken('refresh-0');
    configureRefresh(async () => ok(tokens(1)));
    await refreshSession();
    expect(await tokenStorage.getRefreshToken()).toBe('refresh-1');
    expect(useSession.getState()).toMatchObject({ status: 'authenticated', accessToken: 'access-1' });
  });

  it('allows a new renewal after the previous one finished', async () => {
    await tokenStorage.setRefreshToken('refresh-0');
    const request = jest
      .fn()
      .mockResolvedValueOnce(ok(tokens(1)))
      .mockResolvedValueOnce(ok(tokens(2)));
    configureRefresh(request);
    await refreshSession();
    await refreshSession();
    expect(request).toHaveBeenNthCalledWith(2, 'refresh-1');
  });

  it('ends the session and notifies when the backend rejects the refresh token', async () => {
    await startSession(tokens(0));
    configureRefresh(async () => invalidRefresh());
    const listener = jest.fn();
    const unsubscribe = onSessionEnded(listener);

    await expect(refreshSession()).resolves.toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(useSession.getState()).toMatchObject({ status: 'anonymous', accessToken: null, user: null });
    expect(await tokenStorage.getRefreshToken()).toBeNull();
    unsubscribe();
  });

  it('keeps the session when renewal fails for network reasons', async () => {
    await startSession(tokens(0));
    configureRefresh(async () => {
      throw new NetworkError();
    });
    await expect(refreshSession()).rejects.toBeInstanceOf(NetworkError);
    expect(await tokenStorage.getRefreshToken()).toBe('refresh-0');
  });

  it('keeps the session on a server error during renewal', async () => {
    await startSession(tokens(0));
    configureRefresh(async () => new Response('{}', { status: 500 }));
    await expect(refreshSession()).rejects.toMatchObject({ status: 500 });
    expect(await tokenStorage.getRefreshToken()).toBe('refresh-0');
  });

  it('returns null without calling the backend when there is no stored token', async () => {
    const request = jest.fn();
    configureRefresh(request);
    await expect(refreshSession()).resolves.toBeNull();
    expect(request).not.toHaveBeenCalled();
    expect(useSession.getState().status).toBe('anonymous');
  });
});

describe('bootstrapSession', () => {
  it('starts as a visitor without a stored token', async () => {
    await bootstrapSession();
    expect(useSession.getState().status).toBe('anonymous');
  });

  it('restores the session from the stored refresh token', async () => {
    await tokenStorage.setRefreshToken('refresh-0');
    configureRefresh(async () => ok(tokens(1)));
    await bootstrapSession();
    expect(useSession.getState()).toMatchObject({ status: 'authenticated', user: { id: 'u1' } });
  });

  it('continues as a visitor and keeps the token when offline at startup', async () => {
    await tokenStorage.setRefreshToken('refresh-0');
    configureRefresh(async () => {
      throw new NetworkError();
    });
    await bootstrapSession();
    expect(useSession.getState().status).toBe('anonymous');
    expect(await tokenStorage.getRefreshToken()).toBe('refresh-0');
  });

  it('rethrows unexpected errors', async () => {
    await tokenStorage.setRefreshToken('refresh-0');
    configureRefresh(async () => {
      throw new RangeError('bug');
    });
    await expect(bootstrapSession()).rejects.toBeInstanceOf(RangeError);
  });
});

describe('clearSession', () => {
  it('removes the tokens from memory and from secure storage', async () => {
    await startSession(tokens(0));
    await clearSession();
    expect(useSession.getState()).toMatchObject({ status: 'anonymous', accessToken: null });
    expect(await tokenStorage.getRefreshToken()).toBeNull();
  });
});
