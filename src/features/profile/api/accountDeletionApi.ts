import { api, unwrap, type components } from '@/shared/api';

export type DeletionPreview = components['schemas']['AccountDeletionPreviewDto'];
export type DeletionStatus = components['schemas']['AccountDeletionStatusDto'];
export type DeletionBlocker = components['schemas']['DeletionBlockerDto'];

export const deletionKeys = {
  preview: ['account', 'deletion', 'preview'] as const,
};

/** What would happen: blockers, bookings to cancel with their refund, and the deletion date. */
export const fetchDeletionPreview = (): Promise<DeletionPreview> =>
  unwrap(api.GET('/api/v1/me/account/deletion/preview'));

/**
 * Confirms with the password. On success every session is closed by the backend: the app must
 * forget its tokens right away.
 */
export const requestDeletion = (password: string): Promise<DeletionStatus> =>
  unwrap(api.POST('/api/v1/me/account/deletion', { body: { password } }));
