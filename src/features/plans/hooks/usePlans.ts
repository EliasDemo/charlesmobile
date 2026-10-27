import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { isApiError } from '@/shared/api';
import { i18n } from '@/shared/i18n';
import { showToast, showUnlocked, translateErrorMessage } from '@/shared/ui';
import {
  cancelSubscription,
  fetchBadges,
  fetchPlans,
  fetchShopPlan,
  planKeys,
  setActiveBarbers,
  fetchBalance,
  payWithBalance,
  subscribe,
  type PaymentMethod,
  syncSubscription,
  useFeaturedDays as requestFeaturedDays,
  type BillingInterval,
  type Plan,
} from '../api/plansApi';

/**
 * "Mi plan": the plan, its usage, and the subscription. Coming back to the app (after paying from
 * the email link) asks the backend whether it was paid.
 */
export function useShopPlan(shopId: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: planKeys.shop(shopId),
    queryFn: () => fetchShopPlan(shopId),
    staleTime: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: planKeys.all });

  const sync = useMutation({ mutationFn: () => syncSubscription(shopId), onSettled: refresh });
  const payBalance = useMutation({
    mutationFn: () => payWithBalance(shopId),
    onSuccess: () => {
      refresh();
      showToast(i18n.t('plans:paidNext'));
    },
    onError: (err) =>
      setError(
        isApiError(err) && err.code === 'INSUFFICIENT_BALANCE'
          ? i18n.t('plans:insufficientBalance')
          : translateErrorMessage(err),
      ),
  });
  const pending = query.data?.subscription?.status === 'PENDING';
  const syncRef = useRef(sync.mutate);
  useEffect(() => {
    syncRef.current = sync.mutate;
  });
  useEffect(() => {
    if (!pending) return undefined;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncRef.current();
    });
    return () => subscription.remove();
  }, [pending]);

  const cancel = useMutation({
    mutationFn: (reason?: string) => cancelSubscription(shopId, reason),
    onSuccess: () => {
      refresh();
      showToast(i18n.t('plans:cancelled'));
    },
    onError: (err) => setError(translateErrorMessage(err)),
  });
  const barbers = useMutation({
    mutationFn: (ids: string[]) => setActiveBarbers(shopId, ids),
    onSuccess: () => {
      refresh();
      void queryClient.invalidateQueries({ queryKey: ['shop-management'] });
      showToast(i18n.t('plans:barbersSaved'));
    },
    onError: (err) => setError(translateErrorMessage(err)),
  });
  const featured = useMutation({
    mutationFn: (days: number) => requestFeaturedDays(shopId, days),
    onSuccess: () => {
      refresh();
      showToast(i18n.t('plans:featuredDone'));
    },
    onError: (err) => setError(translateErrorMessage(err)),
  });

  return {
    query,
    error,
    checkPayment: () => sync.mutate(),
    isChecking: sync.isPending,
    payWithBalance: () => {
      setError(null);
      payBalance.mutate();
    },
    isPayingBalance: payBalance.isPending,
    cancel: (reason?: string) => cancel.mutate(reason),
    isCancelling: cancel.isPending,
    saveActiveBarbers: (ids: string[]) => barbers.mutate(ids),
    isSavingBarbers: barbers.isPending,
    useFeatured: (days: number) => featured.mutate(days),
    isFeaturing: featured.isPending,
  };
}

/** Plans to choose and "Contratar": the link goes to the owner's email, never opened here. */
export function usePlanCatalog(shopId: string, audience: Plan['audience'], current: string | null) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: planKeys.catalog(audience), queryFn: () => fetchPlans(audience) });
  const [interval, setInterval] = useState<BillingInterval>('MONTHLY');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Balance in favor, for "Usar mi saldo" (not shown if it cannot be read).
  const balance = useQuery({
    queryKey: planKeys.balance(shopId),
    queryFn: () => fetchBalance(shopId),
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: ({ plan, method }: { plan: Plan; method: PaymentMethod }) =>
      subscribe(shopId, plan.code, interval, current !== null, method),
    onSuccess: (_s, { plan, method }) => {
      if (method === 'BALANCE') showToast(i18n.t('plans:paidWithBalance', { plan: plan.name }));
      else setSentTo(plan.name);
      void queryClient.invalidateQueries({ queryKey: planKeys.all });
    },
    onError: (err) =>
      setError(
        isApiError(err) && err.code === 'BILLING_UNAVAILABLE'
          ? i18n.t('plans:billingUnavailable')
          : isApiError(err) && err.code === 'INSUFFICIENT_BALANCE'
            ? i18n.t('plans:insufficientBalance')
            : translateErrorMessage(err),
      ),
  });
  return {
    query,
    interval,
    setInterval,
    choose: (plan: Plan, method: PaymentMethod = 'GATEWAY') => {
      setError(null);
      mutation.mutate({ plan, method });
    },
    choosing: mutation.isPending
      ? `${mutation.variables?.plan.code}:${mutation.variables?.method}`
      : undefined,
    balance: balance.data ?? null,
    sentTo,
    error,
  };
}

export function usePlanBadges(shopId: string) {
  return useQuery({
    queryKey: planKeys.badges(shopId),
    queryFn: () => fetchBadges(shopId),
    staleTime: 300_000,
  });
}

/**
 * A paid plan became active: "Desbloqueaste…" once, with what it includes (labels from the API).
 * The free/default plan unlocks nothing.
 */
export function usePlanUnlock(shopId: string, plan: Plan | null | undefined, active: boolean) {
  useEffect(() => {
    if (!plan || plan.isDefault || !active) return;
    showUnlocked({
      id: `unlock.plan.${shopId}.${plan.code}`,
      title: i18n.t('plans:unlocked.title', { plan: plan.name }),
      text: i18n.t('plans:unlocked.text'),
      items: plan.entitlements
        .filter((e) => e.value === null || e.value > 0)
        .map((e) => ({
          icon: 'checkmark-circle' as const,
          title: e.label,
          text:
            e.kind === 'LIMIT'
              ? e.value === null
                ? i18n.t('plans:unlocked.unlimited')
                : i18n.t('plans:unlocked.upTo', { value: e.value })
              : undefined,
        })),
    });
  }, [shopId, plan, active]);
}
