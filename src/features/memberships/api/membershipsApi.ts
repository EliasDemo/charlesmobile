import { api, unwrap, type components } from '@/shared/api';

type S = components['schemas'];
export type MembershipPlan = S['MembershipPlanDto'];
export type ManagedMembershipPlan = S['ManagedMembershipPlanDto'];
export type Membership = S['MembershipDto'];
export type MembershipMember = S['ShopMemberDto'];
export type CreateMembershipPlanBody = S['CreateMembershipPlanDto'];
export type UpdateMembershipPlanBody = S['UpdateMembershipPlanDto'];

export const membershipKeys = {
  all: ['memberships'] as const,
  plans: (shopId: string) => ['memberships', 'plans', shopId] as const,
  managed: (shopId: string) => ['memberships', 'managed', shopId] as const,
  members: (shopId: string) => ['memberships', 'members', shopId] as const,
  mine: ['memberships', 'mine'] as const,
};

/** Public: the membership plans a barbershop offers. */
export const fetchMembershipPlans = (id: string): Promise<MembershipPlan[]> =>
  unwrap(api.GET('/api/v1/barbershops/{id}/membership-plans', { params: { path: { id } } }));

/** Returns the membership with its `checkoutUrl` (opened in the app: it is an in-person service). */
export const subscribeMembership = (planId: string): Promise<Membership> =>
  unwrap(api.POST('/api/v1/membership-plans/{planId}/subscribe', { params: { path: { planId } } }));

export const fetchMyMemberships = (): Promise<Membership[]> =>
  unwrap(api.GET('/api/v1/users/me/memberships'));

/** On coming back from the payment page. */
export const syncMembership = (membershipId: string): Promise<Membership> =>
  unwrap(
    api.POST('/api/v1/users/me/memberships/{membershipId}/sync', { params: { path: { membershipId } } }),
  );

export const cancelMembership = (membershipId: string): Promise<Membership> =>
  unwrap(
    api.POST('/api/v1/users/me/memberships/{membershipId}/cancel', { params: { path: { membershipId } } }),
  );

/** Pays a pending booking with a credit. 409 NO_MEMBERSHIP_CREDITS / MEMBERSHIP_NOT_APPLICABLE. */
export const payWithMembership = (bookingId: string, membershipId: string) =>
  unwrap(
    api.POST('/api/v1/bookings/{bookingId}/pay-with-membership', {
      params: { path: { bookingId } },
      body: { membershipId },
    }),
  );

export const fetchManagedMembershipPlans = (id: string): Promise<ManagedMembershipPlan[]> =>
  unwrap(api.GET('/api/v1/barbershops/{id}/membership-plans/manage', { params: { path: { id } } }));

/** Only the OWNER. */
export const createMembershipPlan = (id: string, body: CreateMembershipPlanBody) =>
  unwrap(api.POST('/api/v1/barbershops/{id}/membership-plans', { params: { path: { id } }, body }));

export const updateMembershipPlan = (id: string, planId: string, body: UpdateMembershipPlanBody) =>
  unwrap(
    api.PATCH('/api/v1/barbershops/{id}/membership-plans/{planId}', {
      params: { path: { id, planId } },
      body,
    }),
  );

export const fetchMembershipMembers = (id: string): Promise<MembershipMember[]> =>
  unwrap(api.GET('/api/v1/barbershops/{id}/membership-members', { params: { path: { id } } }));
