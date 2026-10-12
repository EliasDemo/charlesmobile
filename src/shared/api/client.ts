import createClient from 'openapi-fetch';
import { env } from '@/shared/config';
import { ApiError, isErrorBody } from './errors';
import type { paths } from './generated/schema';
import { createApiFetch } from './http';
import { configureRefresh, refreshSession, useSession } from './session';
import { uploadAwareFetch } from './uploadFetch';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const apiFetch = createApiFetch({
  fetchImpl: uploadAwareFetch,
  sleep,
  getAccessToken: () => useSession.getState().accessToken,
  refresh: refreshSession,
  appVersion: env.appVersion,
  platform: env.platform,
});

// The refresh call goes through the same headers and retries, but never through renewal itself.
const refreshFetch = createApiFetch({
  fetchImpl: (request) => fetch(request),
  sleep,
  getAccessToken: () => null,
  refresh: async () => null,
  appVersion: env.appVersion,
  platform: env.platform,
});

configureRefresh((refreshToken) =>
  refreshFetch(
    new Request(`${env.apiUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }),
  ),
);

/** The only API client of the app. Screens never call fetch directly. */
export const api = createClient<paths>({ baseUrl: env.apiUrl, fetch: apiFetch });

interface FetchResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

/** Returns the data of a successful call or throws an ApiError. */
export async function unwrap<T>(promise: Promise<FetchResult<T>>): Promise<T> {
  const { data, error, response } = await promise;
  const requestId = response.headers.get('X-Request-Id');
  // openapi-fetch already consumed the body: build the error from the parsed value.
  if (!response.ok) throw new ApiError(response.status, isErrorBody(error) ? error : null, requestId);
  if (data === undefined && response.status !== 204) {
    throw new ApiError(response.status, null, requestId);
  }
  return data as T;
}
