import { useMutation, useQueryClient } from '@tanstack/react-query';
import { translateError } from '@/shared/api';
import { useThemePreference } from '@/shared/theme';
import {
  profileKeys,
  updateNotificationPreferences,
  type NotificationChannel,
  type NotificationPreferences,
  type Profile,
} from '../api/profileApi';
import { useProfile } from './useProfile';

export const NOTIFICATION_CHANNELS: readonly NotificationChannel[] = ['PUSH', 'EMAIL', 'IN_APP'];

export function usePreferences() {
  const queryClient = useQueryClient();
  const { query } = useProfile();
  const themePreference = useThemePreference((s) => s.preference);
  const setThemePreference = useThemePreference((s) => s.setPreference);

  // Optimistic: the switch moves at once and goes back if the server rejects the change.
  const mutation = useMutation({
    mutationFn: updateNotificationPreferences,
    onMutate: async (preferences) => {
      await queryClient.cancelQueries({ queryKey: profileKeys.me });
      const previous = queryClient.getQueryData<Profile>(profileKeys.me);
      if (previous) {
        queryClient.setQueryData<Profile>(profileKeys.me, {
          ...previous,
          preferences,
        });
      }
      return { previous };
    },
    onError: (_error, _preferences, context) => {
      if (context?.previous) queryClient.setQueryData(profileKeys.me, context.previous);
    },
    onSuccess: (profile) => queryClient.setQueryData(profileKeys.me, profile),
  });

  const preferences: NotificationPreferences | undefined = query.data?.preferences;
  const channels = preferences?.notificationChannels ?? [];
  const toggleChannel = (channel: NotificationChannel, enabled: boolean) => {
    const next = enabled ? [...new Set([...channels, channel])] : channels.filter((c) => c !== channel);
    // Keep the order the backend uses.
    if (!preferences) return;
    mutation.mutate({
      ...preferences,
      notificationChannels: NOTIFICATION_CHANNELS.filter((c) => next.includes(c)),
    });
  };

  return {
    query,
    channels,
    toggleChannel,
    isSaving: mutation.isPending,
    saveError: mutation.error ? translateError(mutation.error).message : null,
    themePreference,
    setThemePreference,
  };
}
