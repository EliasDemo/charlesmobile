import { api, unwrap, type components } from '@/shared/api';

type S = components['schemas'];
export type GalleryImage = S['GalleryImageDto'];
export type GalleryPage = S['GalleryPageDto'];
export type ServiceStyle = S['ServiceStyleDto'];
export type ImageReportReason = S['ImageReportReason'];

export const galleryKeys = {
  all: ['gallery'] as const,
  shop: (shopId: string) => ['gallery', shopId] as const,
  styles: ['service-styles'] as const,
};

const PAGE = 24;

/** Public gallery: `pinned` only comes in the first page and is not repeated in `items`. */
export const fetchGallery = (shopId: string, cursor?: string): Promise<GalleryPage> =>
  unwrap(
    api.GET('/api/v1/barbershops/{id}/gallery', {
      params: { path: { id: shopId }, query: { limit: PAGE, ...(cursor ? { cursor } : {}) } },
    }),
  );

/** Active styles (to tag photos, choose specialties and filter the search). */
export const fetchStyles = (): Promise<ServiceStyle[]> => unwrap(api.GET('/api/v1/service-styles'));

export const reportImage = (imageId: string, reason: ImageReportReason, details: string) =>
  unwrap(
    api.POST('/api/v1/gallery/{imageId}/reports', {
      params: { path: { imageId } },
      body: { reason, ...(details.trim() ? { details: details.trim() } : {}) },
    }),
  );
