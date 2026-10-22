import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

/** Same meaning as the location permission: explain first while `undetermined`. */
export type PushPermission = 'granted' | 'undetermined' | 'denied' | 'blocked';

function toPermission(response: Notifications.NotificationPermissionsStatus): PushPermission {
  if (response.granted) return 'granted';
  if (response.status === Notifications.PermissionStatus.UNDETERMINED) return 'undetermined';
  return response.canAskAgain ? 'denied' : 'blocked';
}

export async function getPushPermission(): Promise<PushPermission> {
  return toPermission(await Notifications.getPermissionsAsync());
}

export async function requestPushPermission(): Promise<PushPermission> {
  return toPermission(await Notifications.requestPermissionsAsync());
}

/**
 * Expo push token of this device, or null when it cannot be had (no permission, or an Android
 * build without Firebase/FCM yet: that comes with the final build). Never logged.
 */
export async function getPushToken(): Promise<string | null> {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return data;
  } catch {
    return null;
  }
}

/** `data` of a tapped push (type and resource); never sensitive (docs/api/PUSH.md). */
export type PushData = Record<string, unknown>;

/** Calls back when the user taps a push, also the one that opened the app from closed. */
export function onPushTapped(callback: (data: PushData) => void): () => void {
  void Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (response) callback(response.notification.request.content.data ?? {});
    })
    .catch(() => undefined);
  const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
    callback(response.notification.request.content.data ?? {}),
  );
  return () => subscription.remove();
}

export const openSystemSettings = () => void Linking.openSettings();

/** Android channels: the person can tune each one in the phone settings; they share our sound. */
const CHANNELS = [
  { id: 'default', importance: 'DEFAULT' },
  { id: 'bookings', importance: 'HIGH' },
  { id: 'messages', importance: 'HIGH' },
  { id: 'payments', importance: 'HIGH' },
  { id: 'promotions', importance: 'LOW' },
] as const;

/**
 * Creates the notification channels (Android 8+), each with the app's sound (bundled by the
 * expo-notifications plugin). Before the next build the sound file is not there and Android
 * uses the default one; the channels still work.
 */
export async function ensureNotificationChannels(names?: Record<string, string>): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Promise.all(
    CHANNELS.map((c) =>
      Notifications.setNotificationChannelAsync(c.id, {
        name: names?.[c.id] ?? c.id,
        importance: Notifications.AndroidImportance[c.importance],
        sound: 'notify.wav',
        vibrationPattern: [0, 180, 120, 180],
      }),
    ),
  ).catch(() => undefined);
}
