import { create } from 'zustand';
import { ApiError, NetworkError, apiErrorFromResponse } from './errors';
import type { components } from './generated/schema';
import { tokenStorage } from './tokenStorage';

export type AuthTokens = components['schemas']['AuthTokensDto'];
export type SessionUser = components['schemas']['SessionUserDto'];

export type SessionStatus = 'unknown' | 'anonymous' | 'authenticated';

interface SessionState {
  status: SessionStatus;
  accessToken: string | null;
  user: SessionUser | null;
}

/** In-memory session. Never persisted: the refresh token lives only in SecureStore. */
export const useSession = create<SessionState>(() => ({ status: 'unknown', accessToken: null, user: null }));

type SessionEndedListener = () => void;
const sessionEndedListeners = new Set<SessionEndedListener>();

/** Notified when the session ends because renewal failed (not on a voluntary logout). */
export function onSessionEnded(listener: SessionEndedListener): () => void {
  sessionEndedListeners.add(listener);
  return () => sessionEndedListeners.delete(listener);
}

export async function startSession(tokens: AuthTokens): Promise<void> {
  await tokenStorage.setRefreshToken(tokens.refreshToken);
  useSession.setState({ status: 'authenticated', accessToken: tokens.accessToken, user: tokens.user });
}

/** Applies a change the backend confirmed (e.g. a verified email) to the in-memory user. */
export function updateSessionUser(changes: Partial<SessionUser>): void {
  const { user } = useSession.getState();
  if (user) useSession.setState({ user: { ...user, ...changes } });
}

export async function clearSession(): Promise<void> {
  useSession.setState({ status: 'anonymous', accessToken: null, user: null });
  await tokenStorage.clear();
}

/** Performs the HTTP call to POST /api/v1/auth/refresh. Injected by the client to avoid a cycle. */
export type RefreshRequest = (refreshToken: string) => Promise<Response>;

let refreshRequest: RefreshRequest | null = null;
export function configureRefresh(request: RefreshRequest): void {
  refreshRequest = request;
}

let inFlight: Promise<string | null> | null = null;

/**
 * Renews the session exactly once at a time (single flight). Concurrent callers share the same
 * promise: two parallel renewals with the same token are treated by the backend as token theft.
 *
 * Resolves with the new access token, or null when there is no session or the backend rejected
 * the refresh token (the session is then cleared). Network failures reject and keep the session,
 * so going offline does not log the user out.
 */
export function refreshSession(): Promise<string | null> {
  inFlight ??= doRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function doRefresh(): Promise<string | null> {
  if (!refreshRequest) throw new Error('refreshSession called before configureRefresh');
  const refreshToken = await tokenStorage.getRefreshToken();
  if (!refreshToken) {
    await clearSession();
    return null;
  }
  const response = await refreshRequest(refreshToken);
  if (response.ok) {
    const tokens = (await response.json()) as AuthTokens;
    await startSession(tokens);
    return tokens.accessToken;
  }
  const error = await apiErrorFromResponse(response);
  if (response.status === 401 || response.status === 403) {
    await endSession();
    return null;
  }
  throw error;
}

async function endSession(): Promise<void> {
  await clearSession();
  sessionEndedListeners.forEach((listener) => listener());
}

/** Restores the session at startup from the stored refresh token. */
export async function bootstrapSession(): Promise<void> {
  if (!(await tokenStorage.getRefreshToken())) {
    useSession.setState({ status: 'anonymous' });
    return;
  }
  try {
    await refreshSession();
  } catch (error) {
    // Offline or server down at startup: keep the stored token and continue as a visitor.
    // The next authenticated request will try to renew again.
    useSession.setState({ status: 'anonymous' });
    if (!(error instanceof ApiError) && !(error instanceof NetworkError)) throw error;
  }
}
