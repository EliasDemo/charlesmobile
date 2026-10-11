import { api, unwrap, type components } from '@/shared/api';

type S = components['schemas'];
export type AppNotification = S['NotificationDto'];
export type NotificationPage = S['NotificationPageDto'];
export type NotificationResource = S['NotificationResourceDto'];
export type RegisterDeviceBody = S['RegisterDeviceDto'];

export const notificationKeys = {
  all: ['notifications'] as const,
  list: ['notifications', 'list'] as const,
  unread: ['notifications', 'unread'] as const,
};

const PAGE = 20;

export const fetchNotifications = (cursor?: string): Promise<NotificationPage> =>
  unwrap(
    api.GET('/api/v1/me/notifications', {
      params: { query: { limit: PAGE, ...(cursor ? { cursor } : {}) } },
    }),
  );

export const fetchUnreadCount = (): Promise<number> =>
  unwrap(api.GET('/api/v1/me/notifications/unread-count')).then((r) => r.unread);

export const markNotificationRead = (id: string) =>
  unwrap(api.POST('/api/v1/me/notifications/{id}/read', { params: { path: { id } } }));

export const markAllNotificationsRead = () => unwrap(api.POST('/api/v1/me/notifications/read-all'));

/** Idempotent: the same token only updates lastSeenAt. The token goes in the body, never the URL. */
export const registerDevice = (body: RegisterDeviceBody) => unwrap(api.PUT('/api/v1/me/devices', { body }));
