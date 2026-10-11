import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { apiError, mockApi, tokens } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import auth from '@/shared/i18n/locales/es/auth.json';
import common from '@/shared/i18n/locales/es/common.json';
import errors from '@/shared/i18n/locales/es/errors.json';
import {
  ForgotPasswordScreen,
  LoginScreen,
  RegisterScreen,
  ResetPasswordScreen,
  SignInPrompt,
  VerifyEmailScreen,
} from '..';

jest.mock('expo-device', () => ({ manufacturer: 'samsung', modelName: 'SM-A546E' }));

beforeEach(resetAppState);

const loginProps = () => ({
  onSuccess: jest.fn(),
  onPendingDeletion: jest.fn(),
  onDisabled: jest.fn(),
  onForgotPassword: jest.fn(),
  onRegister: jest.fn(),
});

describe('LoginScreen', () => {
  it('validates when leaving a field and shows the error next to it', async () => {
    await renderWithProviders(<LoginScreen {...loginProps()} />);
    const email = screen.getByLabelText(auth.fields.email);
    await fireEvent.changeText(email, 'no-es-correo');
    await fireEvent(email, 'blur');
    expect(await screen.findByText(auth.validation.emailInvalid)).toBeTruthy();
  });

  it('shows the generic credentials error', async () => {
    mockApi({ 'POST /api/v1/auth/login': apiError(401, 'INVALID_CREDENTIALS') });
    await renderWithProviders(<LoginScreen {...loginProps()} />);
    await fireEvent.changeText(screen.getByLabelText(auth.fields.email), 'ana@example.com');
    await fireEvent.changeText(screen.getByLabelText(auth.fields.password), 'mala-clave');
    await fireEvent.press(screen.getByRole('button', { name: auth.login.submit }));
    expect(await screen.findByText(errors.codes.INVALID_CREDENTIALS)).toBeTruthy();
  });

  it('disables the button while the account is locked', async () => {
    mockApi({ 'POST /api/v1/auth/login': apiError(429, 'ACCOUNT_LOCKED', [{ retryAfterSeconds: 65 }]) });
    await renderWithProviders(<LoginScreen {...loginProps()} />);
    await fireEvent.changeText(screen.getByLabelText(auth.fields.email), 'ana@example.com');
    await fireEvent.changeText(screen.getByLabelText(auth.fields.password), 'mala-clave');
    await fireEvent.press(screen.getByRole('button', { name: auth.login.submit }));
    expect(await screen.findByText(/1:05/)).toBeTruthy();
    expect(screen.getByRole('button', { name: auth.login.submit })).toBeDisabled();
  });

  it('signs in', async () => {
    mockApi({ 'POST /api/v1/auth/login': { body: tokens() } });
    const props = loginProps();
    await renderWithProviders(<LoginScreen {...props} />);
    await fireEvent.changeText(screen.getByLabelText(auth.fields.email), 'ana@example.com');
    await fireEvent.changeText(screen.getByLabelText(auth.fields.password), 'buena-clave');
    await fireEvent.press(screen.getByRole('button', { name: auth.login.submit }));
    // The email typed goes on to "Verifica tu correo" (the session does not carry it).
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalledWith(expect.anything(), 'ana@example.com'));
  });

  it('shows the notice from the previous step and the links', async () => {
    const props = loginProps();
    await renderWithProviders(<LoginScreen {...props} notice="passwordChanged" />);
    expect(screen.getByText(auth.login.passwordChanged)).toBeTruthy();
    await fireEvent.press(screen.getByText(auth.login.forgot));
    await fireEvent.press(screen.getByText(auth.login.noAccount));
    expect(props.onForgotPassword).toHaveBeenCalled();
    expect(props.onRegister).toHaveBeenCalled();
  });

  it('lets the user show the password', async () => {
    await renderWithProviders(<LoginScreen {...loginProps()} />);
    const field = screen.getByLabelText(auth.fields.password);
    expect(field.props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByLabelText(common.form.showPassword));
    expect(screen.getByLabelText(auth.fields.password).props.secureTextEntry).toBe(false);
  });
});

describe('RegisterScreen', () => {
  const props = () => ({ onSuccess: jest.fn(), onLogin: jest.fn() });

  it('shows loading while the terms load', async () => {
    globalThis.fetch = jest.fn(() => new Promise<Response>(() => undefined)) as unknown as typeof fetch;
    await renderWithProviders(<RegisterScreen {...props()} />);
    expect(screen.getByTestId('loading-state')).toBeTruthy();
  });

  it('shows an error with retry when the terms cannot load', async () => {
    mockApi({ 'GET /api/v1/auth/terms': apiError(500, 'INTERNAL_ERROR') });
    await renderWithProviders(<RegisterScreen {...props()} />);
    expect(await screen.findByTestId('error-state')).toBeTruthy();
    expect(screen.getByText(common.actions.retry)).toBeTruthy();
  });

  it('shows the form, the terms without their internal version and the live password requirements', async () => {
    mockApi({
      'GET /api/v1/auth/terms': {
        body: { version: '2026-10', termsUrl: 'https://example.com/terminos', privacyUrl: null },
      },
    });
    await renderWithProviders(<RegisterScreen {...props()} />);
    expect(await screen.findByText(auth.register.terms)).toBeTruthy();
    // The internal terms version is sent to the backend, never shown.
    expect(screen.queryByText(/2026-10/)).toBeNull();
    expect(screen.getByText(`• ${auth.passwordRules.common}`)).toBeTruthy();
    expect(screen.getByText(/\(0 ahora\)/)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText(auth.fields.password), 'abcdefghij');
    expect(screen.getByText(/✓ Entre 10 y 128 caracteres \(10 ahora\)/)).toBeTruthy();
    expect(screen.getByText(auth.register.termsLink)).toBeTruthy();
    // The privacy link is not shown when GET /auth/terms does not send it.
    expect(screen.queryByText(auth.register.privacyLink)).toBeNull();
  });

  it('requires the declarations before sending', async () => {
    const api = mockApi({
      'GET /api/v1/auth/terms': {
        body: { version: '2026-10', termsUrl: 'https://example.com/terminos', privacyUrl: null },
      },
    });
    await renderWithProviders(<RegisterScreen {...props()} />);
    await screen.findByText(auth.register.terms);
    await fireEvent.press(screen.getByRole('button', { name: auth.register.submit }));
    expect(await screen.findByText(auth.validation.adultRequired)).toBeTruthy();
    expect(screen.getByText(auth.validation.termsRequired)).toBeTruthy();
    expect(api.callsTo('POST', '/api/v1/auth/register')).toHaveLength(0);
  });

  it('creates the account', async () => {
    mockApi({
      'GET /api/v1/auth/terms': {
        body: { version: '2026-10', termsUrl: 'https://example.com/terminos', privacyUrl: null },
      },
      'POST /api/v1/auth/register': { status: 202, body: { message: 'ok' } },
    });
    const p = props();
    await renderWithProviders(<RegisterScreen {...p} />);
    await screen.findByText(auth.register.terms);
    await fireEvent.changeText(screen.getByLabelText(auth.fields.fullName), 'Ana Pérez');
    await fireEvent.changeText(screen.getByLabelText(auth.fields.email), 'ana@example.com');
    await fireEvent.changeText(screen.getByLabelText(auth.fields.password), 'una-clave-larga');
    await fireEvent.press(screen.getByRole('checkbox', { name: auth.register.adult }));
    await fireEvent.press(screen.getByRole('checkbox', { name: auth.register.terms }));
    await fireEvent.press(screen.getByRole('button', { name: auth.register.submit }));
    await waitFor(() => expect(p.onSuccess).toHaveBeenCalled());
  });
});

describe('VerifyEmailScreen', () => {
  it('explains where the code was sent and offers to resend', async () => {
    signIn({ emailVerified: false });
    await renderWithProviders(
      <VerifyEmailScreen email="ana@example.com" onVerified={jest.fn()} onLater={jest.fn()} />,
    );
    expect(screen.getByText(/ana@example.com/)).toBeTruthy();
    expect(screen.getByText(auth.verify.resend)).toBeTruthy();
  });

  it('never shows an empty email when it is not known', async () => {
    signIn({ emailVerified: false });
    await renderWithProviders(<VerifyEmailScreen onVerified={jest.fn()} onLater={jest.fn()} />);
    expect(screen.getByText(auth.verify.subtitleNoEmail)).toBeTruthy();
    expect(screen.queryByText(' a .', { exact: false })).toBeNull();
  });

  it('validates the code format', async () => {
    signIn({ emailVerified: false });
    await renderWithProviders(<VerifyEmailScreen onVerified={jest.fn()} onLater={jest.fn()} />);
    await fireEvent.changeText(screen.getByLabelText(auth.fields.code), '12');
    await fireEvent.press(screen.getByRole('button', { name: auth.verify.submit }));
    expect(await screen.findByText(auth.validation.codeInvalid)).toBeTruthy();
  });

  it('shows the countdown after resending', async () => {
    signIn({ emailVerified: false });
    mockApi({ 'POST /api/v1/auth/email-verification/request': { status: 202, body: { message: 'ok' } } });
    await renderWithProviders(<VerifyEmailScreen onVerified={jest.fn()} onLater={jest.fn()} />);
    await fireEvent.press(screen.getByText(auth.verify.resend));
    expect(await screen.findByText(auth.verify.resent)).toBeTruthy();
    expect(screen.getByText('Reenviar en 60 s')).toBeTruthy();
  });

  it('tells an already verified user so', async () => {
    signIn({ emailVerified: true });
    const onVerified = jest.fn();
    await renderWithProviders(<VerifyEmailScreen onVerified={onVerified} onLater={jest.fn()} />);
    expect(screen.getByText(auth.verify.done)).toBeTruthy();
    await fireEvent.press(screen.getByText(common.actions.continue));
    expect(onVerified).toHaveBeenCalled();
  });
});

describe('password recovery screens', () => {
  it('asks for the email', async () => {
    mockApi({ 'POST /api/v1/auth/password-reset/request': { status: 202, body: { message: 'ok' } } });
    const onSent = jest.fn();
    await renderWithProviders(<ForgotPasswordScreen onSent={onSent} />);
    await fireEvent.changeText(screen.getByLabelText(auth.fields.email), 'ana@example.com');
    await fireEvent.press(screen.getByRole('button', { name: auth.forgot.submit }));
    await waitFor(() => expect(onSent).toHaveBeenCalledWith('ana@example.com'));
  });

  it('warns that every session will close and shows the password requirements', async () => {
    const onResend = jest.fn();
    await renderWithProviders(
      <ResetPasswordScreen email="ana@example.com" onDone={jest.fn()} onResend={onResend} />,
    );
    expect(screen.getByText(auth.reset.warning)).toBeTruthy();
    expect(screen.getByTestId('password-requirements')).toBeTruthy();
    await fireEvent.press(screen.getByText(auth.reset.resend));
    expect(onResend).toHaveBeenCalled();
  });

  it('shows an invalid code', async () => {
    mockApi({ 'POST /api/v1/auth/password-reset/confirm': apiError(400, 'INVALID_CODE') });
    await renderWithProviders(
      <ResetPasswordScreen email="ana@example.com" onDone={jest.fn()} onResend={jest.fn()} />,
    );
    await fireEvent.changeText(screen.getByLabelText(auth.fields.code), '123456');
    await fireEvent.changeText(screen.getByLabelText(auth.fields.newPassword), 'nueva-clave-larga');
    await fireEvent.press(screen.getByRole('button', { name: auth.reset.submit }));
    expect(await screen.findByText(errors.codes.INVALID_CODE)).toBeTruthy();
  });
});

describe('SignInPrompt', () => {
  it('offers to sign in or create an account', async () => {
    const onLogin = jest.fn();
    const onRegister = jest.fn();
    await renderWithProviders(<SignInPrompt onLogin={onLogin} onRegister={onRegister} />);
    await fireEvent.press(screen.getByText(auth.login.submit));
    await fireEvent.press(screen.getByText(auth.register.submit));
    expect(onLogin).toHaveBeenCalled();
    expect(onRegister).toHaveBeenCalled();
  });
});
