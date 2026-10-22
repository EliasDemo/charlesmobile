import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useSession } from '@/shared/api';
import { i18n } from '@/shared/i18n';
import { openPaymentPage } from '@/shared/payments';
import { showToast, translateErrorMessage } from '@/shared/ui';
import {
  cancelMembership,
  createMembershipPlan,
  fetchManagedMembershipPlans,
  fetchMembershipMembers,
  fetchMembershipPlans,
  fetchMyMemberships,
  membershipKeys,
  payWithMembership,
  subscribeMembership,
  syncMembership,
  updateMembershipPlan,
  type CreateMembershipPlanBody,
} from '../api/membershipsApi';

export function useMembershipPlans(shopId: string) {
  return useQuery({ queryKey: membershipKeys.plans(shopId), queryFn: () => fetchMembershipPlans(shopId) });
}

/** "Mis membresías": credits, renewals, and cancelling. */
export function useMyMemberships() {
  const authenticated = useSession((s) => s.status === 'authenticated');
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: membershipKeys.mine,
    queryFn: fetchMyMemberships,
    enabled: authenticated,
    staleTime: 0,
  });
  const cancel = useMutation({
    mutationFn: cancelMembership,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: membershipKeys.all });
      showToast(i18n.t('memberships:cancelled'));
    },
  });
  return {
    query,
    cancel: (id: string) => cancel.mutate(id),
    isCancelling: cancel.isPending,
    error: cancel.error ? translateErrorMessage(cancel.error) : null,
  };
}

/** Subscribe: open the payment page in the app, then ask the backend whether it was paid. */
export function useSubscribeMembership({ onRequireLogin }: { onRequireLogin: () => void }) {
  const authenticated = useSession((s) => s.status === 'authenticated');
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async (planId: string) => {
      const membership = await subscribeMembership(planId);
      if (membership.checkoutUrl) await openPaymentPage(membership.checkoutUrl);
      return syncMembership(membership.id);
    },
    onSuccess: (membership) => {
      void queryClient.invalidateQueries({ queryKey: membershipKeys.all });
      showToast(
        i18n.t(membership.status === 'ACTIVE' ? 'memberships:subscribed' : 'memberships:pendingPayment'),
      );
    },
    onError: (err) => setError(translateErrorMessage(err)),
  });
  return {
    subscribe: (planId: string) => {
      if (!authenticated) {
        onRequireLogin();
        return;
      }
      setError(null);
      mutation.mutate(planId);
    },
    subscribing: mutation.isPending ? mutation.variables : undefined,
    error,
  };
}

/** "Pagar con crédito" on a pending booking, when the client has credits at that barbershop. */
export function usePayWithCredit(
  bookingId: string,
  barbershopId: string,
  { onPaid }: { onPaid: () => void },
) {
  const mine = useMyMemberships();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const usable = (mine.query.data ?? []).filter(
    (m) => m.plan.barbershopId === barbershopId && m.status === 'ACTIVE' && m.credits > 0,
  );
  const mutation = useMutation({
    mutationFn: (membershipId: string) => payWithMembership(bookingId, membershipId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: membershipKeys.all });
      onPaid();
    },
    onError: (err) => setError(translateErrorMessage(err)),
  });
  return {
    membership: usable[0] ?? null,
    pay: (membershipId: string) => {
      setError(null);
      mutation.mutate(membershipId);
    },
    isPaying: mutation.isPending,
    error,
  };
}

/** The barbershop's membership plans and members. */
export function useShopMemberships(shopId: string) {
  const queryClient = useQueryClient();
  const plans = useQuery({
    queryKey: membershipKeys.managed(shopId),
    queryFn: () => fetchManagedMembershipPlans(shopId),
    staleTime: 0,
  });
  const members = useQuery({
    queryKey: membershipKeys.members(shopId),
    queryFn: () => fetchMembershipMembers(shopId),
    staleTime: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: membershipKeys.all });
  const create = useMutation({
    mutationFn: (body: CreateMembershipPlanBody) => createMembershipPlan(shopId, body),
    onSuccess: () => {
      refresh();
      showToast(i18n.t('memberships:shop.created'));
    },
    onError: (err) => setError(translateErrorMessage(err)),
  });
  const toggle = useMutation({
    mutationFn: ({ planId, isActive }: { planId: string; isActive: boolean }) =>
      updateMembershipPlan(shopId, planId, { isActive }),
    onSuccess: refresh,
    onError: (err) => setError(translateErrorMessage(err)),
  });
  return {
    plans,
    members,
    error,
    create: (body: CreateMembershipPlanBody, onDone: () => void) => {
      setError(null);
      create.mutate(body, { onSuccess: onDone });
    },
    isCreating: create.isPending,
    setActive: (planId: string, isActive: boolean) => toggle.mutate({ planId, isActive }),
  };
}
