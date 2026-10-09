import { useMutation, useQuery } from '@tanstack/react-query';
import { create } from 'zustand';
import { isApiError, translateError } from '@/shared/api';
import { cancelDeletion, fetchDeletionStatus } from '../api/authApi';

interface RestrictedAccessState {
  /** Restricted token (scope "deletion"). Memory only: never stored, never the session. */
  token: string | null;
  set: (token: string) => void;
  clear: () => void;
}

export const useRestrictedAccess = create<RestrictedAccessState>((set) => ({
  token: null,
  set: (token) => set({ token }),
  clear: () => set({ token: null }),
}));

/** The restricted token stopped working (expired after 15 minutes, or the account changed). */
const isAccessGone = (error: unknown) =>
  isApiError(error) && (error.status === 401 || error.code === 'ACCOUNT_PENDING_DELETION');

/**
 * Account pending deletion, after a login answered ACCOUNT_PENDING_DELETION: shows the date and
 * lets the user cancel the deletion with the restricted access.
 */
export function usePendingDeletion({ onCancelled }: { onCancelled: () => void }) {
  const token = useRestrictedAccess((s) => s.token);
  const clear = useRestrictedAccess((s) => s.clear);

  const status = useQuery({
    queryKey: ['account', 'deletion', 'status', token],
    queryFn: () => fetchDeletionStatus(token!),
    enabled: token !== null,
    gcTime: 0,
  });

  const cancel = useMutation({
    mutationFn: () => cancelDeletion(token!),
    onSuccess: () => {
      clear();
      onCancelled();
    },
  });

  return {
    hasAccess: token !== null,
    status,
    scheduledFor: status.data?.scheduledFor ?? null,
    /** Already cancelled or never pending: back to a normal login. */
    notPending: status.data?.pending === false,
    expired: isAccessGone(status.error) || isAccessGone(cancel.error),
    cancel: () => cancel.mutate(),
    isCancelling: cancel.isPending,
    cancelError: cancel.error && !isAccessGone(cancel.error) ? translateError(cancel.error).message : null,
    leave: clear,
  };
}
