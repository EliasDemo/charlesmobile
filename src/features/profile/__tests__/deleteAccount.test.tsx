import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { apiError, cancellationPreview, mockApi } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import { useSession } from '@/shared/api';
import { tokenStorage } from '@/shared/api/tokenStorage';
import texts from '@/shared/i18n/locales/es/profile.json';
import type { components } from '@/shared/api';
import { AccountDeletedScreen, DeleteAccountScreen } from '..';

type Preview = components['schemas']['AccountDeletionPreviewDto'];

const preview = (overrides: Partial<Preview> = {}): Preview => ({
  canRequest: true,
  blockers: [],
  bookings: [],
  graceDays: 30,
  scheduledForIfRequestedNow: '2030-02-06T15:00:00.000Z',
  pending: false,
  ...overrides,
});

beforeEach(async () => {
  resetAppState();
  signIn();
  await tokenStorage.setRefreshToken('refresh-0');
});

describe('DeleteAccountScreen', () => {
  it('explains the consequences, the 30 days and the bookings that will be cancelled with their refund', async () => {
    mockApi({
      'GET /api/v1/me/account/deletion/preview': {
        body: preview({
          bookings: [
            {
              bookingId: 'bk-1',
              status: 'CONFIRMED',
              startAt: '2030-01-07T14:00:00.000Z',
              barbershop: { id: 's1', name: 'Barbería Demo Miraflores', timezone: 'America/Lima' },
              refund: cancellationPreview().refund,
            },
          ],
        }),
      },
    });
    await renderWithProviders(<DeleteAccountScreen onDeleted={jest.fn()} />);
    expect(await screen.findByText(/quedará pendiente 30 días.*6 de febrero de 2030/)).toBeTruthy();
    expect(screen.getByText(/No se restauran aunque luego te arrepientas/)).toBeTruthy();
    expect(screen.getByText('Barbería Demo Miraflores')).toBeTruthy();
    expect(screen.getByText(/09:00/)).toBeTruthy(); // in the barbershop zone
    expect(screen.getByText(/Devolución: S\/\s?25[.,]00 \(100 %\)/)).toBeTruthy();
    expect(screen.getByLabelText(texts.deletion.password)).toBeTruthy();
  });

  it('shows the blockers and does not let the user confirm', async () => {
    mockApi({
      'GET /api/v1/me/account/deletion/preview': {
        body: preview({
          canRequest: false,
          blockers: [
            { reason: 'SOLE_OWNER', barbershopId: 's1', barbershopName: 'Barbería Demo Miraflores' },
          ],
        }),
      },
    });
    await renderWithProviders(<DeleteAccountScreen onDeleted={jest.fn()} />);
    expect(await screen.findByText(texts.deletion.blockedTitle)).toBeTruthy();
    expect(screen.getByText(/Eres el único responsable de "Barbería Demo Miraflores"/)).toBeTruthy();
    expect(screen.queryByLabelText(texts.deletion.password)).toBeNull();
  });

  it('marks a wrong password next to the field', async () => {
    mockApi({
      'GET /api/v1/me/account/deletion/preview': { body: preview() },
      'POST /api/v1/me/account/deletion': apiError(401, 'INVALID_CREDENTIALS'),
    });
    await renderWithProviders(<DeleteAccountScreen onDeleted={jest.fn()} />);
    await fireEvent.changeText(await screen.findByLabelText(texts.deletion.password), 'mala');
    await fireEvent.press(screen.getByRole('button', { name: texts.deletion.confirm }));
    expect(await screen.findByText(texts.deletion.wrongPassword)).toBeTruthy();
    expect(useSession.getState().status).toBe('authenticated');
  });

  it('forgets the session at once after the request and reports the date', async () => {
    const api = mockApi({
      'GET /api/v1/me/account/deletion/preview': { body: preview() },
      'POST /api/v1/me/account/deletion': {
        body: {
          pending: true,
          requestedAt: '2030-01-07T15:00:00.000Z',
          scheduledFor: '2030-02-06T15:00:00.000Z',
        },
      },
    });
    const onDeleted = jest.fn();
    await renderWithProviders(<DeleteAccountScreen onDeleted={onDeleted} />);
    await fireEvent.changeText(await screen.findByLabelText(texts.deletion.password), 'buena-clave');
    await fireEvent.press(screen.getByRole('button', { name: texts.deletion.confirm }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith('2030-02-06T15:00:00.000Z'));
    expect(api.callsTo('POST', '/api/v1/me/account/deletion')[0]!.body).toEqual({ password: 'buena-clave' });
    expect(useSession.getState().status).toBe('anonymous');
    expect(await tokenStorage.getRefreshToken()).toBeNull();
  });

  it('shows the current blockers when the backend blocks it meanwhile', async () => {
    let blocked = false;
    mockApi({
      'GET /api/v1/me/account/deletion/preview': () => ({
        body: blocked
          ? preview({
              canRequest: false,
              blockers: [{ reason: 'STAFF_ROLE', barbershopId: null, barbershopName: null }],
            })
          : preview(),
      }),
      'POST /api/v1/me/account/deletion': () => {
        blocked = true;
        return apiError(409, 'DELETION_BLOCKED');
      },
    });
    await renderWithProviders(<DeleteAccountScreen onDeleted={jest.fn()} />);
    await fireEvent.changeText(await screen.findByLabelText(texts.deletion.password), 'clave');
    await fireEvent.press(screen.getByRole('button', { name: texts.deletion.confirm }));
    expect(await screen.findByText(texts.deletion.blockers.STAFF_ROLE)).toBeTruthy();
  });
});

describe('AccountDeletedScreen', () => {
  it('tells the date and how to undo it', async () => {
    const onHome = jest.fn();
    await renderWithProviders(
      <AccountDeletedScreen scheduledFor="2030-02-06T15:00:00.000Z" onHome={onHome} />,
    );
    expect(screen.getByText(/se eliminará el .*6 de febrero de 2030/)).toBeTruthy();
    await fireEvent.press(screen.getByText(texts.deletion.goHome));
    expect(onHome).toHaveBeenCalled();
  });
});
