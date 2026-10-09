import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { translateError } from '@/shared/api';
import {
  changeMemberRole,
  fetchMembers,
  inviteMember,
  removeMember,
  shopKeys,
  type Member,
  type MemberRole,
} from '../api/shopApi';

/** Owners and managers of a barbershop. LAST_OWNER and the rest are explained by the API. */
export function useMembers(shopId: string) {
  const queryClient = useQueryClient();
  const members = useQuery({ queryKey: shopKeys.members(shopId), queryFn: () => fetchMembers(shopId) });
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('MANAGER');
  const [invitedTo, setInvitedTo] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: shopKeys.members(shopId) });

  const invite = useMutation({
    mutationFn: () => inviteMember(shopId, email.trim(), role),
    onSuccess: () => {
      setInvitedTo(email.trim());
      setEmail('');
    },
  });
  const change = useMutation({
    mutationFn: (args: { userId: string; role: MemberRole }) =>
      changeMemberRole(shopId, args.userId, args.role),
    onSuccess: () => void refresh(),
  });
  const remove = useMutation({
    mutationFn: (userId: string) => removeMember(shopId, userId),
    onSuccess: () => {
      setRemoving(null);
      void refresh();
    },
  });

  const error = invite.error ?? change.error ?? remove.error;
  return {
    members,
    email,
    setEmail,
    role,
    setRole,
    sendInvite: () => {
      setInvitedTo(null);
      invite.mutate();
    },
    isInviting: invite.isPending,
    invitedTo,
    changeRole: (userId: string, next: MemberRole) => change.mutate({ userId, role: next }),
    removing,
    askRemove: setRemoving,
    cancelRemove: () => setRemoving(null),
    confirmRemove: () => removing && remove.mutate(removing.userId),
    isRemoving: remove.isPending,
    error: error ? translateError(error).message : null,
  };
}
