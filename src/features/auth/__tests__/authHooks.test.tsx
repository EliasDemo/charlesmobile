import { act, waitFor } from '@testing-library/react-native';
import { apiError, mockApi, tokens } from '@test/mockApi';
import { renderHookWithProviders, resetAppState, signIn } from '@test/render';
import { queryClient, refreshSession, useSession } from '@/shared/api';
import { tokenStorage } from '@/shared/api/tokenStorage';
import auth from '@/shared/i18n/locales/es/auth.json';
import errors from '@/shared/i18n/locales/es/errors.json';
import { useEmailVerification } from '../hooks/useEmailVerification';
import { useLogin } from '../hooks/useLogin';
import { useLogout } from '../hooks/useLogout';
import { useForgotPassword, useResetPassword } from '../hooks/usePasswordReset';
import { useRegister } from '../hooks/useRegister';
import { useSessionEndedRedirect } from '../hooks/useSessionEndedRedirect';

jest.mock('expo-device', () => ({
  manufacturer: 'samsung',
  modelName: 'SM-A546E',
  deviceName: 'Teléfono de Ana',
}));

beforeEach(resetAppState);

async function fill<T extends Record<string, unknown>>(
  form: { setValue: (name: never, value: never) => void },
  values: T,
) {
  await act(async () => {
    for (const [name, value] of Object.entries(values)) form.setValue(name as never, value as never);
  });
}

describe('useLogin', () => {
  it('starts the session, sends only the phone model and reports the user', async () => {
    const api = mockApi({ 'POST /api/v1/auth/login': { body: tokens({ emailVerified: false }) } });
    const onSuccess = jest.fn();
    const { result } = await renderHookWithProviders(() =>
      useLogin({ onSuccess, onPendingDeletion: jest.fn() }),
    );
    await fill(result.current.form, { email: 'ana@example.com', password: 'secreta' });
    await act(() => result.current.submit());

    await waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ emailVerified: false }),
        'ana@example.com',
      ),
    );
    expect(api.callsTo('POST', '/api/v1/auth/login')[0]!.body).toEqual({
      email: 'ana@example.com',
      password: 'secreta',
      deviceName: 'samsung SM-A546E',
    });
    expect(useSession.getState()).toMatchObject({ status: 'authenticated', accessToken: 'access-1' });
    expect(await tokenStorage.getRefreshToken()).toBe('refresh-1');
  });

  it('shows the generic message for wrong credentials', async () => {
    mockApi({ 'POST /api/v1/auth/login': apiError(401, 'INVALID_CREDENTIALS') });
    const { result } = await renderHookWithProviders(() =>
      useLogin({ onSuccess: jest.fn(), onPendingDeletion: jest.fn() }),
    );
    await fill(result.current.form, { email: 'ana@example.com', password: 'mala' });
    await act(() => result.current.submit());
    await waitFor(() => expect(result.current.generalError).toBe(errors.codes.INVALID_CREDENTIALS));
    expect(useSession.getState().status).toBe('anonymous');
  });

  it('counts down an account lock without retrying on its own', async () => {
    const api = mockApi({
      'POST /api/v1/auth/login': apiError(429, 'ACCOUNT_LOCKED', [{ retryAfterSeconds: 90 }]),
    });
    const { result } = await renderHookWithProviders(() =>
      useLogin({ onSuccess: jest.fn(), onPendingDeletion: jest.fn() }),
    );
    await fill(result.current.form, { email: 'ana@example.com', password: 'mala' });
    await act(() => result.current.submit());
    await waitFor(() => expect(result.current.lockedSeconds).toBe(90));
    expect(result.current.generalError).toBeNull();
    expect(api.callsTo('POST', '/api/v1/auth/login')).toHaveLength(1);
  });

  it('handles a lock without a known duration', async () => {
    mockApi({ 'POST /api/v1/auth/login': apiError(429, 'ACCOUNT_LOCKED') });
    const { result } = await renderHookWithProviders(() =>
      useLogin({ onSuccess: jest.fn(), onPendingDeletion: jest.fn() }),
    );
    await fill(result.current.form, { email: 'ana@example.com', password: 'mala' });
    await act(() => result.current.submit());
    await waitFor(() => expect(result.current.lockedWithoutTime).toBe(true));
  });

  it('does not call the API with invalid fields', async () => {
    const api = mockApi({});
    const { result } = await renderHookWithProviders(() =>
      useLogin({ onSuccess: jest.fn(), onPendingDeletion: jest.fn() }),
    );
    await fill(result.current.form, { email: 'nope', password: '' });
    await act(() => result.current.submit());
    expect(api.calls).toHaveLength(0);
    expect(result.current.form.getFieldState('email').error?.message).toBe('validation.emailInvalid');
  });
});

describe('useRegister', () => {
  const valid = {
    fullName: ' Ana Pérez ',
    email: 'ana@example.com',
    password: 'una-clave-larga',
    phone: '987654321',
    declaresAdult: true,
    acceptTerms: true,
  };

  it('sends the accepted terms version and the phone in the backend format', async () => {
    const api = mockApi({
      'GET /api/v1/auth/terms': { body: { version: '2026-10', termsUrl: null, privacyUrl: null } },
      'POST /api/v1/auth/register': { status: 202, body: { message: 'ok' } },
    });
    const onSuccess = jest.fn();
    const { result } = await renderHookWithProviders(() => useRegister({ onSuccess }));
    await waitFor(() => expect(result.current.terms.data?.version).toBe('2026-10'));
    await fill(result.current.form, valid);
    await act(() => result.current.submit());

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(api.callsTo('POST', '/api/v1/auth/register')[0]!.body).toEqual({
      fullName: 'Ana Pérez',
      email: 'ana@example.com',
      password: 'una-clave-larga',
      phone: '+51 987 654 321',
      acceptTerms: true,
      declaresAdult: true,
      termsVersion: '2026-10',
    });
  });

  it('omits an empty phone', async () => {
    const api = mockApi({
      'GET /api/v1/auth/terms': { body: { version: '2026-10', termsUrl: null, privacyUrl: null } },
      'POST /api/v1/auth/register': { status: 202, body: { message: 'ok' } },
    });
    const { result } = await renderHookWithProviders(() => useRegister({ onSuccess: jest.fn() }));
    await waitFor(() => expect(result.current.terms.data).toBeDefined());
    await fill(result.current.form, { ...valid, phone: '' });
    await act(() => result.current.submit());
    await waitFor(() => expect(api.callsTo('POST', '/api/v1/auth/register')).toHaveLength(1));
    expect(api.callsTo('POST', '/api/v1/auth/register')[0]!.body).not.toHaveProperty('phone');
  });

  it('asks to accept again when the terms changed', async () => {
    let version = '2026-10';
    const api = mockApi({
      'GET /api/v1/auth/terms': () => ({ body: { version, termsUrl: null, privacyUrl: null } }),
      'POST /api/v1/auth/register': () => {
        version = '2026-11';
        return apiError(400, 'TERMS_VERSION_OUTDATED');
      },
    });
    const { result } = await renderHookWithProviders(() => useRegister({ onSuccess: jest.fn() }));
    await waitFor(() => expect(result.current.terms.data).toBeDefined());
    await fill(result.current.form, valid);
    await act(() => result.current.submit());

    await waitFor(() => expect(result.current.generalError).toBe(auth.register.termsChanged));
    expect(result.current.form.getValues('acceptTerms')).toBe(false);
    await waitFor(() => expect(result.current.terms.data?.version).toBe('2026-11'));
    expect(api.callsTo('GET', '/api/v1/auth/terms').length).toBeGreaterThanOrEqual(2);
  });

  it('marks backend validation errors on their fields', async () => {
    mockApi({
      'GET /api/v1/auth/terms': { body: { version: '2026-10', termsUrl: null, privacyUrl: null } },
      'POST /api/v1/auth/register': apiError(400, 'VALIDATION_ERROR', [
        { field: 'password', constraints: ['isNotCommonPassword'] },
      ]),
    });
    const { result } = await renderHookWithProviders(() => useRegister({ onSuccess: jest.fn() }));
    await waitFor(() => expect(result.current.terms.data).toBeDefined());
    await fill(result.current.form, valid);
    await act(() => result.current.submit());
    await waitFor(() =>
      expect(result.current.form.getFieldState('password').error?.message).toBe(errors.fields.weakPassword),
    );
    expect(result.current.generalError).toBeNull();
  });
});

describe('useEmailVerification', () => {
  it('marks the email as verified and renews the session', async () => {
    signIn({ emailVerified: false });
    await tokenStorage.setRefreshToken('refresh-0');
    const api = mockApi({
      'POST /api/v1/auth/email-verification/confirm': { status: 204 },
      'POST /api/v1/auth/refresh': { body: tokens() },
    });
    const onVerified = jest.fn();
    const { result } = await renderHookWithProviders(() => useEmailVerification({ onVerified }));
    await fill(result.current.form, { code: '123456' });
    await act(() => result.current.submit());

    await waitFor(() => expect(onVerified).toHaveBeenCalled());
    expect(api.callsTo('POST', '/api/v1/auth/email-verification/confirm')[0]!.body).toEqual({
      code: '123456',
    });
    expect(api.callsTo('POST', '/api/v1/auth/refresh')).toHaveLength(1);
    expect(useSession.getState().user?.emailVerified).toBe(true);
  });

  it('shows an invalid code next to the field area', async () => {
    signIn({ emailVerified: false });
    mockApi({ 'POST /api/v1/auth/email-verification/confirm': apiError(400, 'INVALID_CODE') });
    const { result } = await renderHookWithProviders(() => useEmailVerification({ onVerified: jest.fn() }));
    await fill(result.current.form, { code: '000000' });
    await act(() => result.current.submit());
    await waitFor(() => expect(result.current.generalError).toBe(errors.codes.INVALID_CODE));
  });

  it('resends the code and waits before allowing another', async () => {
    signIn({ emailVerified: false });
    mockApi({ 'POST /api/v1/auth/email-verification/request': { status: 202, body: { message: 'ok' } } });
    const { result } = await renderHookWithProviders(() => useEmailVerification({ onVerified: jest.fn() }));
    await act(async () => result.current.resend());
    await waitFor(() => expect(result.current.resent).toBe(true));
    expect(result.current.resendSecondsLeft).toBe(60);
  });

  it('explains a failed resend', async () => {
    signIn({ emailVerified: false });
    mockApi({
      'POST /api/v1/auth/email-verification/request': apiError(429, 'TOO_MANY_REQUESTS', [
        { retryAfterSeconds: 999 },
      ]),
    });
    const { result } = await renderHookWithProviders(() => useEmailVerification({ onVerified: jest.fn() }));
    await act(async () => result.current.resend());
    await waitFor(() => expect(result.current.generalError).toBe(errors.codes.TOO_MANY_REQUESTS));
  });
});

describe('password reset', () => {
  it('requests a code and passes the email to the next step', async () => {
    const api = mockApi({
      'POST /api/v1/auth/password-reset/request': { status: 202, body: { message: 'ok' } },
    });
    const onSent = jest.fn();
    const { result } = await renderHookWithProviders(() => useForgotPassword({ onSent }));
    await fill(result.current.form, { email: 'ana@example.com' });
    await act(() => result.current.submit());
    await waitFor(() => expect(onSent).toHaveBeenCalledWith('ana@example.com'));
    expect(api.calls[0]!.body).toEqual({ email: 'ana@example.com' });
  });

  it('shows request errors', async () => {
    mockApi({ 'POST /api/v1/auth/password-reset/request': apiError(500, 'INTERNAL_ERROR') });
    const { result } = await renderHookWithProviders(() => useForgotPassword({ onSent: jest.fn() }));
    await fill(result.current.form, { email: 'ana@example.com' });
    await act(() => result.current.submit());
    await waitFor(() => expect(result.current.generalError).toContain('req-test'));
  });

  it('changes the password and forgets this device session (all sessions are closed)', async () => {
    signIn();
    await tokenStorage.setRefreshToken('refresh-0');
    queryClient.setQueryData(['profile', 'me'], { cached: true });
    const api = mockApi({ 'POST /api/v1/auth/password-reset/confirm': { status: 204 } });
    const onDone = jest.fn();
    const { result } = await renderHookWithProviders(() =>
      useResetPassword({ email: 'ana@example.com', onDone }),
    );
    await fill(result.current.form, { code: '123456', newPassword: 'nueva-clave-larga' });
    await act(() => result.current.submit());

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(api.calls[0]!.body).toEqual({
      email: 'ana@example.com',
      code: '123456',
      newPassword: 'nueva-clave-larga',
    });
    expect(useSession.getState().status).toBe('anonymous');
    expect(await tokenStorage.getRefreshToken()).toBeNull();
    expect(queryClient.getQueryData(['profile', 'me'])).toBeUndefined();
  });

  it('marks an invalid code', async () => {
    mockApi({ 'POST /api/v1/auth/password-reset/confirm': apiError(400, 'INVALID_CODE') });
    const { result } = await renderHookWithProviders(() =>
      useResetPassword({ email: 'ana@example.com', onDone: jest.fn() }),
    );
    await fill(result.current.form, { code: '123456', newPassword: 'nueva-clave-larga' });
    await act(() => result.current.submit());
    await waitFor(() => expect(result.current.generalError).toBe(errors.codes.INVALID_CODE));
  });
});

describe('useLogout (session must be fully cleared)', () => {
  async function loggedIn() {
    signIn();
    await tokenStorage.setRefreshToken('refresh-0');
    queryClient.setQueryData(['profile', 'me'], { cached: true });
  }

  it('revokes on the server and clears tokens and cached data', async () => {
    await loggedIn();
    const api = mockApi({ 'POST /api/v1/auth/logout': { status: 204 } });
    const onDone = jest.fn();
    const { result } = await renderHookWithProviders(() => useLogout({ onDone }));
    await act(async () => result.current.logout());

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(api.calls[0]!.body).toEqual({ allDevices: false });
    expect(api.calls[0]!.headers.get('Authorization')).toBe('Bearer access-1');
    expect(useSession.getState()).toMatchObject({ status: 'anonymous', accessToken: null, user: null });
    expect(await tokenStorage.getRefreshToken()).toBeNull();
    expect(queryClient.getQueryData(['profile', 'me'])).toBeUndefined();
  });

  it('clears everything locally even when the server cannot be reached', async () => {
    await loggedIn();
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    const onDone = jest.fn();
    const { result } = await renderHookWithProviders(() => useLogout({ onDone }));
    await act(async () => result.current.logout());

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(useSession.getState().status).toBe('anonymous');
    expect(await tokenStorage.getRefreshToken()).toBeNull();
  });

  it('asks for confirmation before closing every device', async () => {
    await loggedIn();
    const api = mockApi({ 'POST /api/v1/auth/logout': { status: 204 } });
    const { result } = await renderHookWithProviders(() => useLogout({ onDone: jest.fn() }));
    await act(async () => result.current.askLogoutAll());
    expect(result.current.confirmingAll).toBe(true);
    expect(api.calls).toHaveLength(0);

    await act(async () => result.current.cancelLogoutAll());
    expect(result.current.confirmingAll).toBe(false);

    await act(async () => result.current.askLogoutAll());
    await act(async () => result.current.confirmLogoutAll());
    await waitFor(() => expect(api.calls).toHaveLength(1));
    expect(api.calls[0]!.body).toEqual({ allDevices: true });
  });
});

describe('useSessionEndedRedirect (401 that cannot be renewed)', () => {
  it('clears cached data and goes to login with the current screen', async () => {
    signIn();
    await tokenStorage.setRefreshToken('refresh-0');
    queryClient.setQueryData(['profile', 'me'], { cached: true });
    mockApi({ 'POST /api/v1/auth/refresh': apiError(401, 'INVALID_REFRESH_TOKEN') });
    const goToLogin = jest.fn();
    await renderHookWithProviders(() => useSessionEndedRedirect('/profile/edit', goToLogin));

    await act(async () => {
      await refreshSession();
    });
    expect(goToLogin).toHaveBeenCalledWith('/profile/edit');
    expect(queryClient.getQueryData(['profile', 'me'])).toBeUndefined();
    expect(useSession.getState().status).toBe('anonymous');
  });
});
