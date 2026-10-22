import { api, unwrap, type components } from '@/shared/api';

type S = components['schemas'];
export type Plan = S['PlanDto'];
export type ShopPlan = S['BarbershopPlanDto'];
export type Subscription = S['SubscriptionDto'];
export type PlanUsage = S['PlanUsageDto'];
export type BillingInterval = Subscription['interval'];

export const planKeys = {
  all: ['plans'] as const,
  shop: (id: string) => ['plans', 'shop', id] as const,
  catalog: (audience: Plan['audience']) => ['plans', 'catalog', audience] as const,
  badges: (id: string) => ['plans', 'badges', id] as const,
};

/** The plan in force, its subscription and the usage of each limit. */
export const fetchShopPlan = (id: string): Promise<ShopPlan> =>
  unwrap(api.GET('/api/v1/barbershops/{id}/plan', { params: { path: { id } } }));

/** Plans offered: BARBERSHOP, or BARBER for independent barbershops. */
export const fetchPlans = (audience: Plan['audience']): Promise<Plan[]> =>
  unwrap(api.GET('/api/v1/plans', { params: { query: { audience } } }));

/**
 * Only the OWNER. The payment link arrives by email: the app never opens `checkoutUrl` nor shows
 * a "buy" button (Apple and Google rules).
 */
export const subscribe = (id: string, planCode: string, interval: BillingInterval, replace: boolean) =>
  unwrap(
    api.POST('/api/v1/barbershops/{id}/subscription', {
      params: { path: { id } },
      body: { planCode, interval, replace, paymentMethod: 'GATEWAY' },
    }),
  );

/** Asks the backend whether it was paid (on coming back to the app). */
export const syncSubscription = (id: string): Promise<Subscription> =>
  unwrap(api.POST('/api/v1/barbershops/{id}/subscription/sync', { params: { path: { id } } }));

/** The plan stays until the end of the paid period. */
export const cancelSubscription = (id: string, reason?: string): Promise<Subscription> =>
  unwrap(
    api.POST('/api/v1/barbershops/{id}/subscription/cancel', {
      params: { path: { id } },
      body: reason?.trim() ? { reason: reason.trim() } : {},
    }),
  );

/** After moving to a smaller plan, which barbers stay active. */
export const setActiveBarbers = (id: string, barberIds: string[]): Promise<ShopPlan> =>
  unwrap(
    api.PUT('/api/v1/barbershops/{id}/plan/active-barbers', {
      params: { path: { id } },
      body: { barberIds },
    }),
  );

/** Uses featured days included in the plan. */
export const useFeaturedDays = (id: string, days: number) =>
  unwrap(api.POST('/api/v1/barbershops/{id}/featured', { params: { path: { id } }, body: { days } }));

/** Public: whether the barbershop shows the "Verificada" badge. */
export const fetchBadges = (id: string) =>
  unwrap(api.GET('/api/v1/barbershops/{id}/plan/badges', { params: { path: { id } } }));
