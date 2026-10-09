import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { refreshSession, translateError } from '@/shared/api';
import { acceptInvitation, fetchInvitations, shopKeys, type Invitation } from '../api/shopApi';

/** Invitations to join a barbershop (as barber or manager), accepted with the emailed code. */
export function useInvitations() {
  const queryClient = useQueryClient();
  const invitations = useQuery({ queryKey: shopKeys.invitations, queryFn: fetchInvitations, staleTime: 0 });
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [accepted, setAccepted] = useState<Invitation | null>(null);

  const accept = useMutation({
    mutationFn: async (invitation: Invitation) => {
      await acceptInvitation(invitation.id, (codes[invitation.id] ?? '').trim());
      // New roles (BARBER, OWNER or MANAGER) only appear in a renewed token.
      await refreshSession().catch(() => undefined);
      return invitation;
    },
    onSuccess: (invitation) => {
      setAccepted(invitation);
      void queryClient.invalidateQueries({ queryKey: shopKeys.all });
    },
  });

  return {
    invitations,
    code: (id: string) => codes[id] ?? '',
    setCode: (id: string, code: string) => setCodes((c) => ({ ...c, [id]: code })),
    accept: (invitation: Invitation) => accept.mutate(invitation),
    acceptingId: accept.isPending ? accept.variables?.id : null,
    error: accept.error ? translateError(accept.error).message : null,
    accepted,
  };
}
