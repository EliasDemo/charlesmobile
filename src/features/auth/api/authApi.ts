import { api, unwrap, type AuthTokens, type components } from '@/shared/api';

type RegisterBody = components['schemas']['RegisterDto'];
type LoginBody = components['schemas']['LoginDto'];
type PasswordResetConfirmBody = components['schemas']['PasswordResetConfirmDto'];

export const authKeys = {
  terms: ['auth', 'terms'] as const,
};

export const fetchTerms = () => unwrap(api.GET('/api/v1/auth/terms'));

/** Always 202, whether the email exists or not (the backend does not reveal accounts). */
export const register = (body: RegisterBody) => unwrap(api.POST('/api/v1/auth/register', { body }));

export const login = (body: LoginBody): Promise<AuthTokens> =>
  unwrap(api.POST('/api/v1/auth/login', { body }));

export const logout = (allDevices: boolean) =>
  unwrap(api.POST('/api/v1/auth/logout', { body: { allDevices } }));

export const requestEmailCode = () => unwrap(api.POST('/api/v1/auth/email-verification/request'));

export const confirmEmailCode = (code: string) =>
  unwrap(api.POST('/api/v1/auth/email-verification/confirm', { body: { code } }));

/** Same response whether the account exists or not. */
export const requestPasswordReset = (email: string) =>
  unwrap(api.POST('/api/v1/auth/password-reset/request', { body: { email } }));

/** Closes every session of the account on success. */
export const confirmPasswordReset = (body: PasswordResetConfirmBody) =>
  unwrap(api.POST('/api/v1/auth/password-reset/confirm', { body }));

export type SupportAccess = components['schemas']['SupportAccessDto'];
export type DeletionStatus = components['schemas']['AccountDeletionStatusDto'];

/**
 * Restricted access for an account pending deletion (scope "deletion") or disabled ("support"):
 * a short access token without refresh token. It never becomes the app session.
 */
export const supportAccess = (body: LoginBody): Promise<SupportAccess> =>
  unwrap(api.POST('/api/v1/auth/support-access', { body }));

const withToken = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

/** Only works with the restricted token: the deletion date. */
export const fetchDeletionStatus = (token: string): Promise<DeletionStatus> =>
  unwrap(api.GET('/api/v1/me/account/deletion', withToken(token)));

/** Only works with the restricted token: cancels the pending deletion. */
export const cancelDeletion = (token: string): Promise<DeletionStatus> =>
  unwrap(api.DELETE('/api/v1/me/account/deletion', withToken(token)));
