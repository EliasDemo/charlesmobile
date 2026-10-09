import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { apiError, mockApi } from '@test/mockApi';
import { renderHookWithProviders, renderWithProviders, resetAppState } from '@test/render';
import { useSession } from '@/shared/api';
import texts from '@/shared/i18n/locales/es/auth.json';
import { PendingDeletionScreen } from '..';
import { useLogin } from '../hooks/useLogin';
import { useRestrictedAccess } from '../hooks/usePendingDeletion';

jest.mock('expo-device', () => ({ manufacturer: 'samsung', modelName: 'SM-A546E' }));

beforeEach(() => {
  resetAppState();
  useRestrictedAccess.getState().clear();
});

describe('login of an account pending deletion', () => {
  it('gets the restricted access with the same credentials, without starting a session', async () => {
    const api = mockApi({
      'POST /api/v1/auth/login': apiError(403, 'ACCOUNT_PENDING_DELETION'),
      'POST /api/v1/auth/support-access': {
        body: {
          tokenType: 'Bearer',
          accessToken: 'restricted-1',
          accessTokenExpiresAt: '2030-01-01T00:15:00.000Z',
          restricted: true,
          scope: 'deletion',
        },
      },
    });
    const onPendingDeletion = jest.fn();
    const { result } = await renderHookWithProviders(() =>
      useLogin({ onSuccess: jest.fn(), onPendingDeletion }),
    );
    await act(async () => {
      result.current.form.setValue('email', 'ana@example.com');
      result.current.form.setValue('password', 'clave');
    });
    await act(() => result.current.submit());
    await waitFor(() => expect(onPendingDeletion).toHaveBeenCalled());
    expect(api.callsTo('POST', '/api/v1/auth/support-access')[0]!.body).toEqual({
      email: 'ana@example.com',
      password: 'clave',
    });
    expect(useRestrictedAccess.getState().token).toBe('restricted-1');
    expect(useSession.getState().status).toBe('anonymous');
  });
});

const props = () => ({ onCancelled: jest.fn(), onLeave: jest.fn() });

describe('PendingDeletionScreen', () => {
  it('shows the date and cancels the deletion with the restricted token only', async () => {
    useRestrictedAccess.getState().set('restricted-1');
    const api = mockApi({
      'GET /api/v1/me/account/deletion': {
        body: {
          pending: true,
          requestedAt: '2030-01-07T15:00:00.000Z',
          scheduledFor: '2030-02-06T15:00:00.000Z',
        },
      },
      'DELETE /api/v1/me/account/deletion': {
        body: { pending: false, requestedAt: null, scheduledFor: null },
      },
    });
    const p = props();
    await renderWithProviders(<PendingDeletionScreen {...p} />);
    expect(await screen.findByText(/Se eliminará el .*6 de febrero de 2030/)).toBeTruthy();
    await fireEvent.press(screen.getByText(texts.pendingDeletion.cancel));
    await waitFor(() => expect(p.onCancelled).toHaveBeenCalled());
    for (const call of api.calls) expect(call.headers.get('Authorization')).toBe('Bearer restricted-1');
    expect(useRestrictedAccess.getState().token).toBeNull();
  });

  it('asks to log in again when the restricted access expired', async () => {
    useRestrictedAccess.getState().set('restricted-1');
    mockApi({ 'GET /api/v1/me/account/deletion': apiError(401, 'UNAUTHORIZED') });
    const p = props();
    await renderWithProviders(<PendingDeletionScreen {...p} />);
    expect(await screen.findByText(texts.pendingDeletion.expired)).toBeTruthy();
    await fireEvent.press(screen.getByText(texts.login.submit));
    expect(p.onLeave).toHaveBeenCalled();
  });

  it('without access, sends back to login', async () => {
    await renderWithProviders(<PendingDeletionScreen {...props()} />);
    expect(screen.getByText(texts.pendingDeletion.expired)).toBeTruthy();
  });
});
