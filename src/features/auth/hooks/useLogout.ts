import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { clearSession, queryClient } from '@/shared/api';
import { logout } from '../api/authApi';

/**
 * Logout revokes the session on the server and always forgets everything locally (tokens and
 * cached data), even when the request fails (e.g. offline). Device push registration is removed
 * here too once it exists (M8).
 */
export function useLogout({ onDone }: { onDone: () => void }) {
  const [confirmingAll, setConfirmingAll] = useState(false);

  const mutation = useMutation({
    mutationFn: async (allDevices: boolean) => {
      try {
        await logout(allDevices);
      } finally {
        queryClient.clear();
        await clearSession();
      }
    },
    onSettled: () => {
      setConfirmingAll(false);
      onDone();
    },
  });

  return {
    logout: () => mutation.mutate(false),
    /** Irreversible for other devices: asks for confirmation first. */
    askLogoutAll: () => setConfirmingAll(true),
    cancelLogoutAll: () => setConfirmingAll(false),
    confirmLogoutAll: () => mutation.mutate(true),
    confirmingAll,
    isLoggingOut: mutation.isPending,
  };
}
