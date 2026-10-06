import { ApiError, NetworkError, apiErrorFromResponse, retryAfterSeconds } from './errors';

export interface ApiFetchDeps {
  fetchImpl: (request: Request) => Promise<Response>;
  sleep: (ms: number) => Promise<void>;
  getAccessToken: () => string | null;
  /** Single-flight renewal: resolves with a new access token, or null when the session ended. */
  refresh: () => Promise<string | null>;
  appVersion: string;
  platform: string;
  /** Jitter source, injectable for tests. */
  random?: () => number;
}

export const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 8_000;
const MAX_RETRY_AFTER_SECONDS = 30;
const NO_REFRESH_PATHS = ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/refresh'];

export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const exponential = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
  return Math.round(exponential / 2 + (random() * exponential) / 2);
}

/** Network failures are only retried when repeating the request cannot duplicate an action. */
function isSafeToRepeat(request: Request): boolean {
  return ['GET', 'HEAD', 'OPTIONS'].includes(request.method) || request.headers.has('Idempotency-Key');
}

/**
 * The single fetch used by the API client: standard headers, retries and session renewal.
 * Retries reuse the same Request, so an Idempotency-Key is kept across attempts.
 */
export function createApiFetch(deps: ApiFetchDeps) {
  const random = deps.random ?? Math.random;

  async function sendWithRetry(request: Request): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      const canRetry = attempt < MAX_RETRIES;
      let response: Response;
      try {
        response = await deps.fetchImpl(request.clone());
      } catch (cause) {
        if (canRetry && isSafeToRepeat(request)) {
          await deps.sleep(backoffDelay(attempt, random));
          continue;
        }
        throw new NetworkError(cause);
      }

      if (canRetry && response.status === 503) {
        const error = await apiErrorFromResponse(response);
        if (error.details.some((detail) => detail.retryable === true)) {
          await deps.sleep(backoffDelay(attempt, random));
          continue;
        }
      }

      if (canRetry && response.status === 429) {
        const wait = retryAfterSeconds(await apiErrorFromResponse(response), response);
        if (wait === null || wait <= MAX_RETRY_AFTER_SECONDS) {
          await deps.sleep(wait === null ? backoffDelay(attempt, random) : wait * 1000);
          continue;
        }
      }

      return response;
    }
  }

  function withHeaders(request: Request, accessToken: string | null): Request {
    const next = new Request(request.clone());
    next.headers.set('Accept', 'application/json');
    next.headers.set('Accept-Language', 'es');
    next.headers.set('X-App-Version', deps.appVersion);
    next.headers.set('X-App-Platform', deps.platform);
    if (accessToken) next.headers.set('Authorization', `Bearer ${accessToken}`);
    else next.headers.delete('Authorization');
    return next;
  }

  async function shouldRefresh(request: Request, response: Response): Promise<boolean> {
    if (response.status !== 401) return false;
    if (NO_REFRESH_PATHS.some((path) => new URL(request.url).pathname === path)) return false;
    const error: ApiError = await apiErrorFromResponse(response);
    return error.code === 'UNAUTHORIZED';
  }

  return async function apiFetch(request: Request): Promise<Response> {
    const response = await sendWithRetry(withHeaders(request, deps.getAccessToken()));
    if (!(await shouldRefresh(request, response))) return response;

    const token = await deps.refresh();
    if (!token) return response;
    return sendWithRetry(withHeaders(request, token));
  };
}
