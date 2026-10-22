import { act, waitFor } from '@testing-library/react-native';
import { apiError, mockApi } from '@test/mockApi';
import { renderHookWithProviders, resetAppState } from '@test/render';
import { useLogin } from '../hooks/useLogin';
import { useRestrictedAccess } from '../hooks/usePendingDeletion';

describe('disabled account login', () => {
  it('gets the restricted support access and goes to help', async () => {
    resetAppState();
    mockApi({
      'POST /api/v1/auth/login': apiError(403, 'ACCOUNT_DISABLED'),
      'POST /api/v1/auth/support-access': {
        body: {
          tokenType: 'Bearer',
          accessToken: 'restricted-9',
          accessTokenExpiresAt: '2030-01-07T15:15:00.000Z',
          restricted: true,
          scope: 'support',
        },
      },
    });
    const onDisabled = jest.fn();
    const { result } = await renderHookWithProviders(() =>
      useLogin({ onSuccess: jest.fn(), onPendingDeletion: jest.fn(), onDisabled }),
    );
    await act(async () => {
      result.current.form.setValue('login', 'deshabilitada@example.com');
      result.current.form.setValue('password', 'una-clave-larga');
      await result.current.submit();
    });
    await waitFor(() => expect(onDisabled).toHaveBeenCalled());
    expect(useRestrictedAccess.getState()).toMatchObject({ token: 'restricted-9', scope: 'support' });
  });
});
