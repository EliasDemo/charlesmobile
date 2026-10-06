import { NetworkError } from '../errors';
import { MAX_RETRIES, backoffDelay, createApiFetch, type ApiFetchDeps } from '../http';

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

const apiError = (status: number, code: string, details: Record<string, unknown>[] = []) =>
  json(status, { code, message: 'x', details, requestId: 'req-1' });

function setup(responses: (Response | Error)[], overrides: Partial<ApiFetchDeps> = {}) {
  const queue = [...responses];
  const seen: Request[] = [];
  const deps: ApiFetchDeps = {
    fetchImpl: jest.fn(async (request: Request) => {
      seen.push(request);
      const next = queue.shift();
      if (!next) throw new Error('No more mocked responses');
      if (next instanceof Error) throw next;
      return next;
    }),
    sleep: jest.fn(async () => undefined),
    getAccessToken: () => 'access-1',
    refresh: jest.fn(async () => 'access-2'),
    appVersion: '1.2.3',
    platform: 'android',
    random: () => 0.5,
    ...overrides,
  };
  return { apiFetch: createApiFetch(deps), deps, seen };
}

const get = (path = '/api/v1/users/me') => new Request(`http://api.test${path}`);
const post = (path: string, headers: Record<string, string> = {}) =>
  new Request(`http://api.test${path}`, { method: 'POST', body: '{"a":1}', headers });

describe('createApiFetch', () => {
  it('adds the standard headers and the access token', async () => {
    const { apiFetch, seen } = setup([json(200, {})]);
    await apiFetch(get());
    const headers = seen[0]!.headers;
    expect(headers.get('Authorization')).toBe('Bearer access-1');
    expect(headers.get('X-App-Version')).toBe('1.2.3');
    expect(headers.get('X-App-Platform')).toBe('android');
    expect(headers.get('Accept-Language')).toBe('es');
  });

  it('sends no Authorization header without a session', async () => {
    const { apiFetch, seen } = setup([json(200, {})], { getAccessToken: () => null });
    await apiFetch(get());
    expect(seen[0]!.headers.has('Authorization')).toBe(false);
  });

  it('retries network failures on GET with growing delays', async () => {
    const { apiFetch, deps } = setup([
      new TypeError('offline'),
      new TypeError('offline'),
      json(200, { ok: true }),
    ]);
    const response = await apiFetch(get());
    expect(response.status).toBe(200);
    expect(deps.sleep).toHaveBeenNthCalledWith(
      1,
      backoffDelay(0, () => 0.5),
    );
    expect(deps.sleep).toHaveBeenNthCalledWith(
      2,
      backoffDelay(1, () => 0.5),
    );
  });

  it('gives up with a NetworkError after the maximum retries', async () => {
    const failures = Array.from({ length: MAX_RETRIES + 1 }, () => new TypeError('offline'));
    const { apiFetch, deps } = setup(failures);
    await expect(apiFetch(get())).rejects.toBeInstanceOf(NetworkError);
    expect(deps.fetchImpl).toHaveBeenCalledTimes(MAX_RETRIES + 1);
  });

  it('does not retry a POST without Idempotency-Key on network failure', async () => {
    const { apiFetch, deps } = setup([new TypeError('offline')]);
    await expect(apiFetch(post('/api/v1/bookings/1/cancel'))).rejects.toBeInstanceOf(NetworkError);
    expect(deps.fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('reuses the same Idempotency-Key and body when retrying', async () => {
    const { apiFetch, seen } = setup([new TypeError('timeout'), json(201, { id: 'b1' })]);
    await apiFetch(post('/api/v1/bookings', { 'Idempotency-Key': 'key-1' }));
    expect(seen.map((r) => r.headers.get('Idempotency-Key'))).toEqual(['key-1', 'key-1']);
    expect(await seen[1]!.text()).toBe('{"a":1}');
  });

  it('retries a 503 marked retryable', async () => {
    const { apiFetch, deps } = setup([
      apiError(503, 'SERVICE_UNAVAILABLE', [{ retryable: true }]),
      json(201, { id: 'b1' }),
    ]);
    const response = await apiFetch(post('/api/v1/bookings', { 'Idempotency-Key': 'key-1' }));
    expect(response.status).toBe(201);
    expect(deps.fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not retry a 503 without retryable', async () => {
    const { apiFetch, deps } = setup([apiError(503, 'SERVICE_UNAVAILABLE')]);
    const response = await apiFetch(get());
    expect(response.status).toBe(503);
    expect(deps.fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('never retries ACCOUNT_LOCKED: the user decides when to try again', async () => {
    const { apiFetch, deps } = setup([apiError(429, 'ACCOUNT_LOCKED', [{ retryAfterSeconds: 3 }])]);
    const response = await apiFetch(post('/api/v1/auth/login'));
    expect(response.status).toBe(429);
    expect(deps.fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('waits the time indicated in details before retrying a rate limit', async () => {
    const { apiFetch, deps } = setup([
      apiError(429, 'TOO_MANY_REQUESTS', [{ retryAfterSeconds: 3 }]),
      json(200, {}),
    ]);
    await apiFetch(get());
    expect(deps.sleep).toHaveBeenCalledWith(3000);
  });

  it('uses the Retry-After header on a 429', async () => {
    const { apiFetch, deps } = setup([
      json(
        429,
        { code: 'TOO_MANY_REQUESTS', message: 'x', details: [], requestId: 'r' },
        { 'Retry-After': '2' },
      ),
      json(200, {}),
    ]);
    await apiFetch(get());
    expect(deps.sleep).toHaveBeenCalledWith(2000);
  });

  it('returns a 429 whose wait is too long instead of blocking', async () => {
    const { apiFetch, deps } = setup([apiError(429, 'TOO_MANY_REQUESTS', [{ retryAfterSeconds: 600 }])]);
    const response = await apiFetch(get());
    expect(response.status).toBe(429);
    expect(deps.sleep).not.toHaveBeenCalled();
  });

  it('never retries other 4xx', async () => {
    const { apiFetch, deps } = setup([apiError(409, 'SLOT_NOT_AVAILABLE')]);
    const response = await apiFetch(post('/api/v1/bookings', { 'Idempotency-Key': 'k' }));
    expect(response.status).toBe(409);
    expect(deps.fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('renews the session on 401 UNAUTHORIZED and repeats the request with the new token', async () => {
    const { apiFetch, deps, seen } = setup([apiError(401, 'UNAUTHORIZED'), json(200, { ok: true })]);
    const response = await apiFetch(post('/api/v1/bookings/1/cancel'));
    expect(response.status).toBe(200);
    expect(deps.refresh).toHaveBeenCalledTimes(1);
    expect(seen[1]!.headers.get('Authorization')).toBe('Bearer access-2');
    expect(await seen[1]!.text()).toBe('{"a":1}');
  });

  it('returns the 401 when the session could not be renewed', async () => {
    const { apiFetch, deps } = setup([apiError(401, 'UNAUTHORIZED')], { refresh: jest.fn(async () => null) });
    const response = await apiFetch(get());
    expect(response.status).toBe(401);
    expect(deps.fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does not renew on login errors', async () => {
    const { apiFetch, deps } = setup([apiError(401, 'INVALID_CREDENTIALS')]);
    await apiFetch(post('/api/v1/auth/login'));
    expect(deps.refresh).not.toHaveBeenCalled();
  });

  it('does not renew on the auth endpoints even with UNAUTHORIZED', async () => {
    const { apiFetch, deps } = setup([apiError(401, 'UNAUTHORIZED')]);
    await apiFetch(post('/api/v1/auth/refresh'));
    expect(deps.refresh).not.toHaveBeenCalled();
  });

  it('tolerates non-JSON error bodies', async () => {
    const { apiFetch } = setup([new Response('<html>bad gateway</html>', { status: 503 })]);
    const response = await apiFetch(get());
    expect(response.status).toBe(503);
  });
});

describe('backoffDelay', () => {
  it('grows exponentially and is capped', () => {
    const fixed = () => 1;
    expect(backoffDelay(0, fixed)).toBe(500);
    expect(backoffDelay(1, fixed)).toBe(1000);
    expect(backoffDelay(10, fixed)).toBe(8000);
  });
});
