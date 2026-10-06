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
