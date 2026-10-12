import { api, unwrap, type components } from '@/shared/api';

export type Profile = components['schemas']['ProfileDto'];
export type NotificationChannel = components['schemas']['NotificationChannel'];
export type Gender = components['schemas']['Gender'];
export type ProfileUpdate = components['schemas']['UpdateProfileDto'];

export const profileKeys = {
  me: ['profile', 'me'] as const,
};

export const fetchProfile = (): Promise<Profile> => unwrap(api.GET('/api/v1/users/me'));

/** Only the fields sent change; `null` removes `phone`, `birthDate` or `gender`. */
export const updateProfile = (body: ProfileUpdate): Promise<Profile> =>
  unwrap(api.PATCH('/api/v1/users/me', { body }));

const multipart = { bodySerializer: (body: unknown) => body as FormData };

/** The server crops it to a 512 px square and strips its metadata. */
export const uploadProfilePhoto = (form: FormData) =>
  unwrap(api.PUT('/api/v1/users/me/photo', { body: form as never, ...multipart }));

export const deleteProfilePhoto = () => unwrap(api.DELETE('/api/v1/users/me/photo'));

/** The current session stays; the backend closes the others and sends a notice by email. */
export const changePassword = (body: { currentPassword: string; newPassword: string }) =>
  unwrap(api.POST('/api/v1/users/me/password', { body }));

export type NotificationPreferences = Profile['preferences'];

/** Sends the whole preferences object, so fields this screen does not edit keep their value. */
export const updateNotificationPreferences = (preferences: NotificationPreferences): Promise<Profile> =>
  unwrap(api.PATCH('/api/v1/users/me', { body: { preferences } }));
