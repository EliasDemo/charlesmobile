import { api, unwrap, type components } from '@/shared/api';

export type WaitlistEntry = components['schemas']['WaitlistEntryDto'];
export type JoinWaitlistBody = components['schemas']['JoinWaitlistDto'];

export const waitlistKeys = {
  all: ['waitlist'] as const,
  mine: ['waitlist', 'mine'] as const,
};

/** Idempotent: the same request returns the same entry. 409 when there are already 5 active lists. */
export const joinWaitlist = (barbershopId: string, body: JoinWaitlistBody) =>
  unwrap(api.POST('/api/v1/barbershops/{id}/waitlist', { params: { path: { id: barbershopId } }, body }));

/** Active and notified entries. */
export const fetchMyWaitlist = (): Promise<WaitlistEntry[]> => unwrap(api.GET('/api/v1/me/waitlist'));

/** 204; 404 when it no longer exists (already left or expired). */
export const leaveWaitlist = (entryId: string) =>
  unwrap(api.DELETE('/api/v1/me/waitlist/{entryId}', { params: { path: { entryId } } }));
