import { api, unwrap, type components } from '@/shared/api';

type S = components['schemas'];
export type Video = S['VideoDto'];
export type VideoReportReason = S['VideoReportDto']['reason'];

/** Whose videos: a barbershop's (max. 5) or the barber's own profile (max. 10). */
export type VideoOwner = { kind: 'shop'; shopId: string } | { kind: 'me' };

export const videoKeys = {
  all: ['videos'] as const,
  shop: (id: string) => ['videos', 'shop', id] as const,
  profile: (id: string) => ['videos', 'profile', id] as const,
  manage: (owner: VideoOwner) => ['videos', 'manage', owner.kind === 'me' ? 'me' : owner.shopId] as const,
};

const multipart = { bodySerializer: (body: unknown) => body as FormData };

export const fetchShopVideos = (id: string): Promise<Video[]> =>
  unwrap(api.GET('/api/v1/barbershops/{id}/videos', { params: { path: { id } } }));

export const fetchProfileVideos = (id: string): Promise<Video[]> =>
  unwrap(api.GET('/api/v1/barber-profiles/{id}/videos', { params: { path: { id } } }));

/** Mine, also while processing or failed. */
export const fetchManagedVideos = (owner: VideoOwner): Promise<Video[]> =>
  owner.kind === 'me'
    ? unwrap(api.GET('/api/v1/me/barber-profile/videos'))
    : unwrap(api.GET('/api/v1/barbershops/{id}/videos/manage', { params: { path: { id: owner.shopId } } }));

/** Answers 202 PROCESSING: the list is read again until READY or FAILED. */
export const uploadVideo = (owner: VideoOwner, form: FormData): Promise<Video> =>
  owner.kind === 'me'
    ? unwrap(api.POST('/api/v1/me/barber-profile/videos', { body: form as never, ...multipart }))
    : unwrap(
        api.POST('/api/v1/barbershops/{id}/videos', {
          params: { path: { id: owner.shopId } },
          body: form as never,
          ...multipart,
        }),
      );

export const deleteVideo = (id: string) =>
  unwrap(api.DELETE('/api/v1/videos/{id}', { params: { path: { id } } }));

export const reportVideo = (id: string, reason: VideoReportReason) =>
  unwrap(api.POST('/api/v1/videos/{id}/report', { params: { path: { id } }, body: { reason } }));
