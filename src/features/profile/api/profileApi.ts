import { api, unwrap, type components } from '@/shared/api';

export type Profile = components['schemas']['ProfileDto'];
export type NotificationChannel = components['schemas']['NotificationChannel'];

export const profileKeys = {
  me: ['profile', 'me'] as const,
};

export const fetchProfile = (): Promise<Profile> => unwrap(api.GET('/api/v1/users/me'));

// `phone` is not sent until the contract types it as string | null (backend fix pending).
export const updateFullName = (fullName: string): Promise<Profile> =>
  unwrap(api.PATCH('/api/v1/users/me', { body: { fullName } }));

export type NotificationPreferences = Profile['preferences'];

/** Sends the whole preferences object, so fields this screen does not edit keep their value. */
export const updateNotificationPreferences = (preferences: NotificationPreferences): Promise<Profile> =>
  unwrap(api.PATCH('/api/v1/users/me', { body: { preferences } }));
