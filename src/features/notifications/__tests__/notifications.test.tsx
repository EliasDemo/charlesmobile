import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { apiError, mockApi } from '@test/mockApi';
import { renderHookWithProviders, renderWithProviders, resetAppState, signIn } from '@test/render';
import type { components } from '@/shared/api';
import texts from '@/shared/i18n/locales/es/notifications.json';
import {
  InboxScreen,
  NotificationBell,
  PushPermissionPrompt,
  notificationTarget,
  useDeviceRegistration,
} from '..';

type S = components['schemas'];
const push = Notifications as jest.Mocked<typeof Notifications>;

const notice = (overrides: Partial<S['NotificationDto']> = {}): S['NotificationDto'] => ({
  id: 'n1',
  type: 'BOOKING_CONFIRMED',
  title: 'Reserva confirmada',
  body: 'Toca para ver los detalles',
  resource: { type: 'booking', id: 'bk-1' },
  createdAt: '2030-01-07T15:00:00.000Z',
  readAt: null,
  ...overrides,
});

beforeEach(async () => {
  resetAppState();
  jest.clearAllMocks();
  await SecureStore.deleteItemAsync('charles.pushAsked');
  signIn();
});

describe('notificationTarget', () => {
  it('maps each resource to its screen', () => {
    expect(notificationTarget({ type: 'booking', id: 'b' })).toEqual({ kind: 'booking', id: 'b' });
    expect(notificationTarget({ type: 'barbershop', id: 's' })).toEqual({ kind: 'shop' });
    // A freed waitlist slot opens the barbershop to book, not the owner's panel.
    expect(notificationTarget({ type: 'barbershop', id: 's' }, 'WAITLIST_SLOT_FREED')).toEqual({
      kind: 'bookShop',
      barbershopId: 's',
    });
    expect(notificationTarget({ type: 'review', id: 's1' })).toEqual({ kind: 'shopReviews', shopId: 's1' });
    expect(notificationTarget({ type: 'ticket', id: 't' })).toEqual({ kind: 'ticket', id: 't' });
    expect(notificationTarget({ type: 'account', id: null })).toEqual({ kind: 'support' });
    expect(notificationTarget({ type: 'conversation', id: 'c' })).toEqual({ kind: 'conversation', id: 'c' });
  });

  it('sends a job application to the side that should act on it', () => {
    const resource = { type: 'job_application' as const, id: 'a' };
    expect(notificationTarget(resource, 'JOB_APPLICATION_RECEIVED')).toEqual({ kind: 'shopJobs' });
    expect(notificationTarget(resource, 'JOB_APPLICATION_UPDATED')).toEqual({ kind: 'myApplications' });
    expect(notificationTarget({ type: 'account', id: null }, 'PLAN_UPDATE')).toEqual({ kind: 'myPlan' });
    expect(notificationTarget({ type: 'account', id: null }, 'MEMBERSHIP_UPDATE')).toEqual({
      kind: 'myMemberships',
    });
  });
});

describe('InboxScreen', () => {
  it('opens a notice, marking it as read', async () => {
    const api = mockApi({
      'GET /api/v1/me/notifications': { body: { items: [notice()], nextCursor: null } },
      'POST /api/v1/me/notifications/{id}/read': { status: 204 },
      'GET /api/v1/me/notifications/unread-count': { body: { unread: 0 } },
    });
    const onOpen = jest.fn();
    await renderWithProviders(<InboxScreen onOpen={onOpen} />);
    expect(await screen.findByText(texts.unread)).toBeTruthy();
    await fireEvent.press(screen.getByText('Reserva confirmada'));
    expect(onOpen).toHaveBeenCalledWith({ type: 'booking', id: 'bk-1' }, 'BOOKING_CONFIRMED');
    await waitFor(() =>
      expect(api.calls.some((c) => c.path === '/api/v1/me/notifications/n1/read')).toBe(true),
    );
  });

  it('marks everything as read', async () => {
    const api = mockApi({
      'GET /api/v1/me/notifications': { body: { items: [notice()], nextCursor: null } },
      'POST /api/v1/me/notifications/read-all': { status: 204 },
    });
    await renderWithProviders(<InboxScreen onOpen={jest.fn()} />);
    await fireEvent.press(await screen.findByRole('button', { name: texts.readAll }));
    await waitFor(() => expect(api.calls.some((c) => c.path.endsWith('/read-all'))).toBe(true));
  });

  it('groups notices by day and filters the unread ones', async () => {
    const now = Date.now();
    mockApi({
      'GET /api/v1/me/notifications': {
        body: {
          items: [
            notice({
              id: 'n1',
              title: 'Se liberó un turno',
              type: 'WAITLIST_SLOT_FREED',
              createdAt: new Date(now).toISOString(),
            }),
            notice({
              id: 'n2',
              title: 'Reserva confirmada antigua',
              readAt: new Date(now).toISOString(),
              createdAt: new Date(now - 10 * 86_400_000).toISOString(),
            }),
          ],
          nextCursor: null,
        },
      },
    });
    await renderWithProviders(<InboxScreen onOpen={jest.fn()} />);
    expect(await screen.findByText(texts.groups.today)).toBeTruthy();
    expect(screen.getByText(texts.groups.older)).toBeTruthy();
    expect(screen.getByText(texts.ago.now)).toBeTruthy();

    await fireEvent.press(screen.getByText(texts.filters.unreadCount.replace('{{count}}', '1')));
    expect(screen.getByText('Se liberó un turno')).toBeTruthy();
    expect(screen.queryByText('Reserva confirmada antigua')).toBeNull();
  });

  it('explains an empty inbox', async () => {
    mockApi({ 'GET /api/v1/me/notifications': { body: { items: [], nextCursor: null } } });
    await renderWithProviders(<InboxScreen onOpen={jest.fn()} />);
    expect(await screen.findByText(texts.empty)).toBeTruthy();
  });

  it('shows errors with retry', async () => {
    mockApi({ 'GET /api/v1/me/notifications': apiError(500, 'INTERNAL_ERROR') });
    await renderWithProviders(<InboxScreen onOpen={jest.fn()} />);
    expect(await screen.findByRole('button', { name: /reintentar/i })).toBeTruthy();
  });
});

describe('NotificationBell', () => {
  it('shows the unread count for screen readers and on the badge', async () => {
    mockApi({ 'GET /api/v1/me/notifications/unread-count': { body: { unread: 3 } } });
    await renderWithProviders(<NotificationBell onPress={jest.fn()} />);
    expect(await screen.findByLabelText('Avisos: 3 sin leer')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('is hidden without a session', async () => {
    resetAppState();
    mockApi({});
    await renderWithProviders(<NotificationBell onPress={jest.fn()} />);
    expect(screen.queryByTestId('notification-bell')).toBeNull();
  });
});

describe('push permission', () => {
  it('explains first, asks once, and registers the device when granted', async () => {
    push.requestPermissionsAsync.mockResolvedValueOnce({
      status: 'granted',
      granted: true,
      canAskAgain: true,
    } as never);
    push.getExpoPushTokenAsync.mockResolvedValueOnce({ data: 'ExponentPushToken[abc]', type: 'expo' });
    const api = mockApi({
      'PUT /api/v1/me/devices': {
        body: { id: 'd1', platform: 'ANDROID', appVersion: '1.0.0', lastSeenAt: '2030-01-07T15:00:00.000Z' },
      },
    });
    await renderWithProviders(<PushPermissionPrompt when />);
    expect(await screen.findByText(texts.prompt.title)).toBeTruthy();
    expect(push.requestPermissionsAsync).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: texts.prompt.accept }));
    await waitFor(() => expect(api.calls.some((c) => c.method === 'PUT')).toBe(true));
    const body = api.calls.find((c) => c.method === 'PUT')?.body as Record<string, unknown>;
    expect(body.pushToken).toBe('ExponentPushToken[abc]');
    expect(await SecureStore.getItemAsync('charles.pushAsked')).toBe('1');
  });

  it('does not ask again once asked', async () => {
    await SecureStore.setItemAsync('charles.pushAsked', '1');
    mockApi({});
    await renderWithProviders(<PushPermissionPrompt when />);
    await waitFor(() => expect(push.getPermissionsAsync).toHaveBeenCalled());
    expect(screen.queryByText(texts.prompt.title)).toBeNull();
  });

  it('registers the device at start only when permission was already granted', async () => {
    push.getPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
    } as never);
    push.getExpoPushTokenAsync.mockResolvedValueOnce({ data: 'ExponentPushToken[xyz]', type: 'expo' });
    const api = mockApi({
      'PUT /api/v1/me/devices': {
        body: { id: 'd1', platform: 'ANDROID', appVersion: null, lastSeenAt: '2030-01-07T15:00:00.000Z' },
      },
    });
    await renderHookWithProviders(() => useDeviceRegistration());
    await waitFor(() => expect(api.calls.some((c) => c.method === 'PUT')).toBe(true));
    push.getPermissionsAsync.mockReset();
  });
});
