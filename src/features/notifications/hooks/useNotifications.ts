import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { nextPageParam, translateError, useSession } from '@/shared/api';
import { env } from '@/shared/config';
import {
  getPushPermission,
  getPushToken,
  onPushTapped,
  openSystemSettings,
  requestPushPermission,
  type PushPermission,
} from '@/shared/lib';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  notificationKeys,
  registerDevice,
  type AppNotification,
  type NotificationPage,
  type NotificationResource,
} from '../api/notificationsApi';

/** The bell refreshes while the app is open (and when it comes back to the foreground). */
const UNREAD_REFRESH_MS = 60_000;

/** Unread count for the bell. Only with a session. */
export function useUnreadCount() {
  const authenticated = useSession((s) => s.status === 'authenticated');
  const query = useQuery({
    queryKey: notificationKeys.unread,
    queryFn: fetchUnreadCount,
    enabled: authenticated,
    refetchInterval: UNREAD_REFRESH_MS,
  });
  return { authenticated, count: authenticated ? (query.data ?? 0) : 0 };
}

/** Inbox: newest first, kept 90 days by the backend. Opening one marks it as read. */
export function useInbox() {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: notificationKeys.list,
    queryFn: ({ pageParam }) => fetchNotifications(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: NotificationPage) => nextPageParam(last),
    staleTime: 0,
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  const read = useMutation({ mutationFn: markNotificationRead, onSettled: refresh });
  const readAll = useMutation({ mutationFn: markAllNotificationsRead, onSettled: refresh });
  const items = query.data?.pages.flatMap((page) => page.items);
  return {
    list: {
      items,
      error: query.error,
      hasNextPage: query.hasNextPage,
      isFetchingNextPage: query.isFetchingNextPage,
      isRefetching: query.isRefetching,
      fetchNextPage: query.fetchNextPage,
      refetch: query.refetch,
    },
    hasUnread: items?.some((n) => n.readAt === null) ?? false,
    /** Marks it as read (if needed) and returns where it leads. */
    open: (notification: AppNotification): NotificationResource => {
      if (notification.readAt === null) read.mutate(notification.id);
      return notification.resource;
    },
    readAll: () => readAll.mutate(),
    isReadingAll: readAll.isPending,
    error: readAll.error ? translateError(readAll.error).message : null,
  };
}

/**
 * Registers this device for push while there is a session and permission (at start and after
 * login). Without a token (no permission, or Android without FCM until the final build) it just
 * does nothing: the inbox works anyway. On logout the backend removes this device itself.
 */
export function useDeviceRegistration() {
  const userId = useSession((s) => (s.status === 'authenticated' ? (s.user?.id ?? null) : null));
  const registeredFor = useRef<string | null>(null);
  useEffect(() => {
    if (!userId || registeredFor.current === userId) return;
    void (async () => {
      if ((await getPushPermission().catch(() => 'denied')) !== 'granted') return;
      const pushToken = await getPushToken();
      if (!pushToken) return;
      await registerDevice({
        pushToken,
        platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
        appVersion: env.appVersion,
      });
      registeredFor.current = userId;
    })().catch(() => undefined);
    return undefined;
  }, [userId]);
  useEffect(() => {
    if (!userId) registeredFor.current = null;
  }, [userId]);
}

/** Where a tapped push leads: its `resource` (type and id), the only data the push carries. */
export function usePushTaps(onOpen: (resource: NotificationResource) => void) {
  const handler = useRef(onOpen);
  useEffect(() => {
    handler.current = onOpen;
  });
  useEffect(
    () =>
      onPushTapped((data) => {
        const resource = data.resource as Partial<NotificationResource> | undefined;
        if (resource && typeof resource.type === 'string') {
          handler.current({ type: resource.type, id: resource.id ?? null } as NotificationResource);
        }
      }),
    [],
  );
}

// Asked once per device; a UI preference, not sensitive.
const ASKED_KEY = 'charles.pushAsked';

/**
 * Asks for push permission at a meaningful moment (the first confirmed booking), with an
 * explanation first. Only once, and only while the system has not been asked yet.
 */
export function usePushPrompt(when: boolean) {
  const [visible, setVisible] = useState(false);
  const [permission, setPermission] = useState<PushPermission | null>(null);
  const checked = useRef(false);
  useEffect(() => {
    if (!when || checked.current) return;
    checked.current = true;
    void (async () => {
      const asked = await SecureStore.getItemAsync(ASKED_KEY).catch(() => null);
      const current = await getPushPermission().catch(() => 'denied' as const);
      setPermission(current);
      if (!asked && current === 'undetermined') setVisible(true);
    })();
  }, [when]);

  const markAsked = () => void SecureStore.setItemAsync(ASKED_KEY, '1').catch(() => undefined);
  return {
    visible,
    permission,
    accept: async () => {
      setVisible(false);
      markAsked();
      const result = await requestPushPermission().catch(() => 'denied' as const);
      setPermission(result);
      if (result !== 'granted') return;
      const pushToken = await getPushToken();
      if (pushToken) {
        await registerDevice({
          pushToken,
          platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
          appVersion: env.appVersion,
        }).catch(() => undefined);
      }
    },
    later: () => {
      setVisible(false);
      markAsked();
    },
    openSettings: openSystemSettings,
  };
}

export type NotificationTarget =
  | { kind: 'booking'; id: string }
  | { kind: 'ticket'; id: string }
  | { kind: 'support' }
  | { kind: 'shop' }
  | { kind: 'inbox' };

/**
 * Screen a notice leads to (docs/api/PUSH.md): a booking, a support ticket, the help screen
 * (account notices), or the barbershop panel.
 */
export function notificationTarget(resource: NotificationResource): NotificationTarget {
  if (resource.type === 'booking' && resource.id) return { kind: 'booking', id: resource.id };
  if (resource.type === 'barbershop' || resource.type === 'review') return { kind: 'shop' };
  if (resource.type === 'ticket' && resource.id) return { kind: 'ticket', id: resource.id };
  if (resource.type === 'account' || resource.type === 'ticket') return { kind: 'support' };
  return { kind: 'inbox' };
}
