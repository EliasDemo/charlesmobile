import { api, unwrap, type components } from '@/shared/api';

type S = components['schemas'];
export type MyReview = S['MyReviewDto'];
export type MyReviewPage = S['MyReviewPageDto'];
export type ManagedReview = S['ManagedReviewDto'];
export type ManagedReviewPage = S['ManagedReviewPageDto'];
export type ReviewStatus = S['ReviewStatus'];
export type PendingReviewBooking = S['BookingDto'];
export type ReviewReportReason = S['CreateReviewReportDto']['reason'];
export type ReviewReportTarget = NonNullable<S['CreateReviewReportDto']['target']>;

export const reviewKeys = {
  all: ['reviews'] as const,
  mine: ['reviews', 'mine'] as const,
  pending: ['reviews', 'pending'] as const,
  shop: (shopId: string) => ['reviews', 'shop', shopId] as const,
};

const PAGE = 20;
const page = (cursor?: string) => ({ limit: PAGE, ...(cursor ? { cursor } : {}) });

/** Rating 1 to 5; comment optional (3 to 500), `null` removes it. */
export const createReview = (bookingId: string, rating: number, comment: string | null) =>
  unwrap(
    api.POST('/api/v1/bookings/{id}/review', {
      params: { path: { id: bookingId } },
      body: { rating, ...(comment ? { comment } : {}) },
    }),
  );

export const updateReview = (reviewId: string, rating: number, comment: string | null) =>
  unwrap(
    api.PATCH('/api/v1/reviews/{id}', { params: { path: { id: reviewId } }, body: { rating, comment } }),
  );

export const deleteReview = (reviewId: string) =>
  unwrap(api.DELETE('/api/v1/reviews/{id}', { params: { path: { id: reviewId } } }));

export const fetchMyReviews = (cursor?: string): Promise<MyReviewPage> =>
  unwrap(api.GET('/api/v1/me/reviews', { params: { query: page(cursor) } }));

/** Bookings the client can review now (canReview), newest first. */
export const fetchPendingReviews = (): Promise<PendingReviewBooking[]> =>
  unwrap(api.GET('/api/v1/me/bookings/pending-reviews')).then((r) => r.items);

/** All reviews of my barbershop (also hidden or under review), for OWNER or MANAGER. */
export const fetchManagedReviews = (shopId: string, cursor?: string): Promise<ManagedReviewPage> =>
  unwrap(
    api.GET('/api/v1/me/barbershops/{id}/reviews', { params: { path: { id: shopId }, query: page(cursor) } }),
  );

export const respondReview = (reviewId: string, text: string) =>
  unwrap(api.PUT('/api/v1/reviews/{id}/response', { params: { path: { id: reviewId } }, body: { text } }));

export const reportReview = (
  reviewId: string,
  target: ReviewReportTarget,
  reason: ReviewReportReason,
  details: string,
) =>
  unwrap(
    api.POST('/api/v1/reviews/{id}/reports', {
      params: { path: { id: reviewId } },
      body: { target, reason, ...(details.trim() ? { details: details.trim() } : {}) },
    }),
  );
