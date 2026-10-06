import type { components } from './generated/schema';

export type ErrorResponse = components['schemas']['ErrorResponseDto'];

/** The contract types `details` as opaque objects; their keys depend on the code. */
export interface ErrorBody {
  code?: string;
  message?: string;
  details?: Record<string, unknown>[];
  requestId?: string;
}

/** Error returned by the backend with the standard `{ code, message, details, requestId }` shape. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown>[];
  readonly requestId: string | null;

  constructor(status: number, body: ErrorBody | null, requestId: string | null = null) {
    super(body?.message ?? `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.code ?? 'UNKNOWN';
    this.details = Array.isArray(body?.details) ? body.details : [];
    this.requestId = body?.requestId ?? requestId;
  }
}

/** The request never got an HTTP response (offline, timeout, DNS…). */
export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super('Network request failed');
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;
export const isNetworkError = (error: unknown): error is NetworkError => error instanceof NetworkError;

export function isErrorBody(value: unknown): value is ErrorResponse {
  return typeof value === 'object' && value !== null && typeof (value as ErrorResponse).code === 'string';
}

/** Builds an ApiError from a non-2xx response, tolerating bodies that are not JSON. */
export async function apiErrorFromResponse(response: Response): Promise<ApiError> {
  const requestId = response.headers.get('X-Request-Id');
  let body: unknown = null;
  try {
    body = await response.clone().json();
  } catch {
    // Non-JSON error body (proxy, HTML page…): keep only the status.
  }
  return new ApiError(response.status, isErrorBody(body) ? body : null, requestId);
}

/** `details[0].retryAfterSeconds` (ACCOUNT_LOCKED) or the `Retry-After` header, in seconds. */
export function retryAfterSeconds(error: ApiError, response?: Response): number | null {
  const fromDetails = error.details[0]?.retryAfterSeconds;
  if (typeof fromDetails === 'number' && fromDetails >= 0) return fromDetails;
  const header = response?.headers.get('Retry-After');
  const parsed = header ? Number(header) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
