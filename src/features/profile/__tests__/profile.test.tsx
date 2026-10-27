import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { apiError, mockApi, profile } from '@test/mockApi';
import { renderHookWithProviders, renderWithProviders, resetAppState, signIn } from '@test/render';
import { queryClient, useSession } from '@/shared/api';
import auth from '@/shared/i18n/locales/es/auth.json';
import common from '@/shared/i18n/locales/es/common.json';
import errors from '@/shared/i18n/locales/es/errors.json';
import texts from '@/shared/i18n/locales/es/profile.json';
import { loadThemePreference, useThemePreference } from '@/shared/theme';
import { EditProfileScreen, PreferencesScreen, ProfileScreen } from '..';
import { usePreferences } from '../hooks/usePreferences';

beforeEach(() => {
  resetAppState();
  useThemePreference.setState({ preference: 'system' });
});

const profileProps = () => ({
  onLogin: jest.fn(),
  onRegister: jest.fn(),
  onVerifyEmail: jest.fn(),
  onEditProfile: jest.fn(),
  onChangePassword: jest.fn(),
  onCareer: jest.fn(),
  onMemberships: jest.fn(),
  onPreferences: jest.fn(),
  onFavorites: jest.fn(),
  onNotifications: jest.fn(),
  onWaitlist: jest.fn(),
  onHelp: jest.fn(),
  onMyReviews: jest.fn(),
  onWelcome: jest.fn(),
  onDeleteAccount: jest.fn(),
  onSwitchMode: jest.fn(),
  onCreateShop: jest.fn(),
  onInvitations: jest.fn(),
  onLoggedOut: jest.fn(),
});

describe('ProfileScreen', () => {
  it('invites visitors to sign in', async () => {
    const props = profileProps();
    await renderWithProviders(<ProfileScreen {...props} />);
    await fireEvent.press(screen.getByText(auth.login.submit));
    expect(props.onLogin).toHaveBeenCalled();
  });

  it('shows loading while the profile is on its way', async () => {
    signIn();
    globalThis.fetch = jest.fn(() => new Promise<Response>(() => undefined)) as unknown as typeof fetch;
    await renderWithProviders(<ProfileScreen {...profileProps()} />);
    expect(screen.getByTestId('loading-state')).toBeTruthy();
  });

  it('shows the profile', async () => {
    signIn();
    mockApi({ 'GET /api/v1/users/me': { body: profile() } });
    await renderWithProviders(<ProfileScreen {...profileProps()} />);
    expect(await screen.findByText('Ana Pérez')).toBeTruthy();
    expect(screen.getByText('ana@example.com')).toBeTruthy();
    expect(screen.getByText('+51 987 654 321')).toBeTruthy();
    expect(screen.queryByText(texts.unverified.title)).toBeNull();
  });

  it('shows an error with retry', async () => {
    signIn();
    mockApi({ 'GET /api/v1/users/me': apiError(500, 'INTERNAL_ERROR') });
    await renderWithProviders(<ProfileScreen {...profileProps()} />);
    expect(await screen.findByTestId('error-state')).toBeTruthy();
    expect(screen.getByText(common.actions.retry)).toBeTruthy();
  });

  it('asks to verify the email when needed', async () => {
    signIn({ emailVerified: false });
    mockApi({ 'GET /api/v1/users/me': { body: profile({ emailVerified: false, phone: null }) } });
    const props = profileProps();
    await renderWithProviders(<ProfileScreen {...props} />);
    expect(await screen.findByText(texts.unverified.title)).toBeTruthy();
    expect(screen.getByText(texts.noPhone)).toBeTruthy();
    await fireEvent.press(screen.getByText(texts.unverified.action));
    expect(props.onVerifyEmail).toHaveBeenCalledWith('ana@example.com');
  });

  it('confirms before closing every session and explains the consequences', async () => {
    signIn();
    const api = mockApi({
      'GET /api/v1/users/me': { body: profile() },
      'POST /api/v1/auth/logout': { status: 204 },
    });
    const props = profileProps();
    await renderWithProviders(<ProfileScreen {...props} />);
    await screen.findByText('Ana Pérez');
    await fireEvent.press(screen.getByText(auth.logout.allDevices));
    expect(screen.getByText(auth.logout.confirmMessage)).toBeTruthy();
    expect(api.callsTo('POST', '/api/v1/auth/logout')).toHaveLength(0);
    await fireEvent.press(screen.getByText(auth.logout.confirm));
    await waitFor(() => expect(props.onLoggedOut).toHaveBeenCalled());
    expect(api.callsTo('POST', '/api/v1/auth/logout')[0]!.body).toEqual({ allDevices: true });
    expect(useSession.getState().status).toBe('anonymous');
  });

  it('logs out on this device', async () => {
    signIn();
    const api = mockApi({
      'GET /api/v1/users/me': { body: profile() },
      'POST /api/v1/auth/logout': { status: 204 },
    });
    const props = profileProps();
    await renderWithProviders(<ProfileScreen {...props} />);
    await screen.findByText('Ana Pérez');
    await fireEvent.press(screen.getByText(auth.logout.action));
    expect(screen.getByText(auth.logout.singleTitle)).toBeTruthy();
    await fireEvent.press(screen.getAllByText(auth.logout.action).at(-1)!);
    await waitFor(() => expect(props.onLoggedOut).toHaveBeenCalled());
    expect(api.callsTo('POST', '/api/v1/auth/logout')[0]!.body).toEqual({ allDevices: false });
  });
});

describe('EditProfileScreen', () => {
  it('loads the current name and saves the new one', async () => {
    signIn();
    const api = mockApi({
      'GET /api/v1/users/me': { body: profile() },
      'PATCH /api/v1/users/me': { body: profile({ fullName: 'Ana María Pérez' }) },
    });
    const onSaved = jest.fn();
    await renderWithProviders(<EditProfileScreen onSaved={onSaved} />);
    const name = await screen.findByLabelText(auth.fields.fullName);
    await waitFor(() => expect(screen.getByLabelText(auth.fields.fullName).props.value).toBe('Ana Pérez'));
    await fireEvent.changeText(name, 'Ana María Pérez');
    await fireEvent.press(screen.getByRole('button', { name: texts.edit.submit }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(api.callsTo('PATCH', '/api/v1/users/me')[0]!.body).toEqual({
      fullName: 'Ana María Pérez',
      phone: '+51 987 654 321',
      birthDate: null,
      gender: null,
    });
    expect(useSession.getState().user?.fullName).toBe('Ana María Pérez');
  });

  it('keeps the email locked and lets the user change or remove the phone', async () => {
    signIn();
    const api = mockApi({
      'GET /api/v1/users/me': { body: profile() },
      'PATCH /api/v1/users/me': { body: profile({ phone: null }) },
    });
    const onSaved = jest.fn();
    await renderWithProviders(<EditProfileScreen onSaved={onSaved} />);
    const phone = await screen.findByLabelText(auth.fields.phone);
    expect(screen.getByLabelText(texts.email).props.editable).toBe(false);
    await waitFor(() => expect(screen.getByLabelText(auth.fields.phone).props.value).toBe('987 654 321'));

    await fireEvent.changeText(phone, '123');
    await fireEvent(phone, 'blur');
    expect(await screen.findByText(auth.validation.phoneInvalid)).toBeTruthy();

    await fireEvent.changeText(phone, '');
    await fireEvent.press(screen.getByRole('button', { name: texts.edit.submit }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    // Empty removes the phone.
    expect(api.callsTo('PATCH', '/api/v1/users/me')[0]!.body).toEqual({
      fullName: 'Ana Pérez',
      phone: null,
      birthDate: null,
      gender: null,
    });
  });

  it('requires a name and shows server errors', async () => {
    signIn();
    mockApi({
      'GET /api/v1/users/me': { body: profile() },
      'PATCH /api/v1/users/me': apiError(500, 'INTERNAL_ERROR'),
    });
    await renderWithProviders(<EditProfileScreen onSaved={jest.fn()} />);
    const name = await screen.findByLabelText(auth.fields.fullName);
    await fireEvent.changeText(name, ' ');
    await fireEvent.press(screen.getByRole('button', { name: texts.edit.submit }));
    expect(await screen.findByText(auth.validation.fullNameRequired)).toBeTruthy();
    await fireEvent.changeText(name, 'Ana');
    await fireEvent.press(screen.getByRole('button', { name: texts.edit.submit }));
    expect(await screen.findByText(/req-test/)).toBeTruthy();
  });
});

describe('preferences', () => {
  it('shows the notification channels with the "coming soon" note', async () => {
    signIn();
    mockApi({ 'GET /api/v1/users/me': { body: profile() } });
    await renderWithProviders(
      <PreferencesScreen onReplayTutorial={jest.fn()} onChangePassword={jest.fn()} onHelp={jest.fn()} />,
    );
    expect(await screen.findByLabelText(texts.preferences.channels.PUSH)).toBeTruthy();
    expect(screen.getByText(texts.preferences.notificationsSoon)).toBeTruthy();
    expect(screen.getByLabelText(texts.preferences.channels.PUSH).props.value).toBe(false);
    expect(screen.getByLabelText(texts.preferences.channels.EMAIL).props.value).toBe(true);
  });

  it('saves a channel change in the backend order and keeps the reminders setting', async () => {
    signIn();
    const api = mockApi({
      'GET /api/v1/users/me': { body: profile() },
      'PATCH /api/v1/users/me': {
        body: profile({
          preferences: { notificationChannels: ['PUSH', 'EMAIL', 'IN_APP'], reminders: false },
        }),
      },
    });
    const { result } = await renderHookWithProviders(() => usePreferences());
    await waitFor(() => expect(result.current.channels).toEqual(['EMAIL', 'IN_APP']));
    await act(async () => result.current.toggleChannel('PUSH', true));
    await waitFor(() => expect(api.callsTo('PATCH', '/api/v1/users/me')).toHaveLength(1));
    expect(api.callsTo('PATCH', '/api/v1/users/me')[0]!.body).toEqual({
      // reminders is not edited here: it is sent back unchanged.
      preferences: { notificationChannels: ['PUSH', 'EMAIL', 'IN_APP'], reminders: false },
    });
    await waitFor(() => expect(result.current.channels).toEqual(['PUSH', 'EMAIL', 'IN_APP']));
  });

  it('puts the switch back if the server rejects the change', async () => {
    signIn();
    mockApi({
      'GET /api/v1/users/me': { body: profile() },
      'PATCH /api/v1/users/me': apiError(409, 'CONFLICT'),
    });
    const { result } = await renderHookWithProviders(() => usePreferences());
    await waitFor(() => expect(result.current.channels).toEqual(['EMAIL', 'IN_APP']));
    await act(async () => result.current.toggleChannel('EMAIL', false));
    await waitFor(() => expect(result.current.saveError).toBe(errors.codes.CONFLICT));
    expect(result.current.channels).toEqual(['EMAIL', 'IN_APP']);
  });

  it('changes the theme and remembers it after a restart', async () => {
    signIn();
    mockApi({ 'GET /api/v1/users/me': { body: profile() } });
    const view = await renderWithProviders(
      <PreferencesScreen onReplayTutorial={jest.fn()} onChangePassword={jest.fn()} onHelp={jest.fn()} />,
    );
    await screen.findByLabelText(texts.preferences.channels.PUSH);
    await fireEvent.press(screen.getByRole('radio', { name: texts.preferences.themeLight }));
    expect(useThemePreference.getState().preference).toBe('light');
    await waitFor(() =>
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('charles.themePreference', 'light'),
    );

    await view.unmount();
    useThemePreference.setState({ preference: 'system' });
    await loadThemePreference();
    expect(useThemePreference.getState().preference).toBe('light');
  });

  it('ignores an invalid saved theme', async () => {
    await SecureStore.setItemAsync('charles.themePreference', 'purple');
    await loadThemePreference();
    expect(useThemePreference.getState().preference).toBe('system');
    expect(queryClient).toBeDefined();
  });
});
