import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { nextPageParam, translateError, useSession } from '@/shared/api';
import { i18n } from '@/shared/i18n';
import { showToast } from '@/shared/ui';
import {
  createReview,
  deleteReview,
  fetchManagedReviews,
  fetchMyReviews,
  fetchPendingReviews,
  reportReview,
  respondReview,
  reviewKeys,
  updateReview,
  type ManagedReview,
  type ManagedReviewPage,
  type MyReview,
  type MyReviewPage,
  type ReviewReportReason,
  type ReviewReportTarget,
} from '../api/reviewsApi';

/** Limits published in the contract (CreateReviewDto, ReviewResponseInputDto, reports). */
export const COMMENT_MIN = 3;
export const COMMENT_MAX = 500;
export const RESPONSE_MAX = 500;
export const REPORT_DETAILS_MAX = 500;
export const REVIEW_REPORT_REASONS: ReviewReportReason[] = [
  'OFFENSIVE',
  'PERSONAL_DATA',
  'FAKE',
  'SPAM',
  'OTHER',
];

const invalidateAll = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.invalidateQueries({ queryKey: reviewKeys.all });
  // The booking carries canReview / review: read it again.
  void queryClient.invalidateQueries({ queryKey: ['bookings'] });
};

/** My reviews, newest first, with the barbershop response. */
export function useMyReviews() {
  const query = useInfiniteQuery({
    queryKey: reviewKeys.mine,
    queryFn: ({ pageParam }) => fetchMyReviews(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: MyReviewPage) => nextPageParam(last),
    staleTime: 0,
  });
  return {
    items: query.data?.pages.flatMap((p) => p.items),
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isRefetching: query.isRefetching,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}

/** Bookings waiting for a review ("¿Cómo te fue?"). Only with a session. */
export function usePendingReviews() {
  const authenticated = useSession((s) => s.status === 'authenticated');
  return useQuery({ queryKey: reviewKeys.pending, queryFn: fetchPendingReviews, enabled: authenticated });
}

/**
 * Review a booking (new) or edit mine (once, while `canEdit`). The comment is optional: empty is
 * sent as nothing (new) or `null` (edit, removes it). Withdrawing is confirmed first.
 */
export function useReviewForm({
  bookingId,
  existing,
  onDone,
}: {
  bookingId?: string;
  existing?: MyReview;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const trimmed = comment.trim();
  const commentError = trimmed.length > 0 && trimmed.length < COMMENT_MIN ? 'form.commentShort' : null;

  const save = useMutation({
    mutationFn: () =>
      existing
        ? updateReview(existing.id, rating, trimmed || null)
        : createReview(bookingId!, rating, trimmed || null),
    onSuccess: () => {
      invalidateAll(queryClient);
      showToast(i18n.t(existing ? 'reviews:form.updated' : 'reviews:form.sent'));
      onDone();
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteReview(existing!.id),
    onSuccess: () => {
      setConfirmingDelete(false);
      invalidateAll(queryClient);
      showToast(i18n.t('reviews:form.deleted'));
      onDone();
    },
    onError: () => setConfirmingDelete(false),
  });
  const error = save.error ?? remove.error;
  return {
    editing: Boolean(existing),
    rating,
    setRating,
    comment,
    setComment,
    commentError,
    canSave: rating >= 1 && !commentError && comment.length <= COMMENT_MAX,
    save: () => save.mutate(),
    isSaving: save.isPending,
    confirmingDelete,
    askDelete: () => setConfirmingDelete(true),
    cancelDelete: () => setConfirmingDelete(false),
    confirmDelete: () => remove.mutate(),
    isDeleting: remove.isPending,
    error: error ? translateError(error).message : null,
  };
}

/** One of my reviews by id, from my list (there is no endpoint for a single one). */
export function useMyReview(reviewId: string) {
  const list = useMyReviews();
  const review = list.items?.find((r) => r.id === reviewId);
  const keepLooking = !review && list.hasNextPage && !list.isFetchingNextPage && !list.error;
  const { fetchNextPage } = list;
  useEffect(() => {
    if (keepLooking) void fetchNextPage();
  }, [keepLooking, fetchNextPage]);
  return {
    review,
    loading: !review && (list.items === undefined || list.hasNextPage),
    error: list.error,
    retry: list.refetch,
  };
}

/** Reviews of my barbershop with their state; respond (or edit the response) when `canRespond`. */
export function useShopReviews(shopId: string) {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: reviewKeys.shop(shopId),
    queryFn: ({ pageParam }) => fetchManagedReviews(shopId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: ManagedReviewPage) => nextPageParam(last),
    staleTime: 0,
  });
  const [responding, setResponding] = useState<ManagedReview | null>(null);
  const [text, setText] = useState('');
  const respond = useMutation({
    mutationFn: () => respondReview(responding!.id, text.trim()),
    onSuccess: () => {
      setResponding(null);
      void queryClient.invalidateQueries({ queryKey: reviewKeys.shop(shopId) });
      showToast(i18n.t('reviews:shop.responded'));
    },
  });
  return {
    list: {
      items: query.data?.pages.flatMap((p) => p.items),
      error: query.error,
      hasNextPage: query.hasNextPage,
      isFetchingNextPage: query.isFetchingNextPage,
      isRefetching: query.isRefetching,
      fetchNextPage: query.fetchNextPage,
      refetch: query.refetch,
    },
    responding,
    askRespond: (review: ManagedReview) => {
      respond.reset();
      setText(review.response?.text ?? '');
      setResponding(review);
    },
    cancelRespond: () => setResponding(null),
    text,
    setText,
    canSend: text.trim().length > 0 && text.length <= RESPONSE_MAX,
    send: () => respond.mutate(),
    isSending: respond.isPending,
    error: respond.error ? translateError(respond.error).message : null,
  };
}

/** Report a review (or the barbershop response to it). */
export function useReportReview(reviewId: string, target: ReviewReportTarget) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReviewReportReason | null>(null);
  const [details, setDetails] = useState('');
  const mutation = useMutation({
    mutationFn: () => reportReview(reviewId, target, reason!, details),
    onSuccess: () => {
      setOpen(false);
      showToast(i18n.t('reviews:report.sent'));
    },
  });
  return {
    open,
    ask: () => {
      setReason(null);
      setDetails('');
      mutation.reset();
      setOpen(true);
    },
    close: () => setOpen(false),
    reason,
    setReason,
    details,
    setDetails,
    canSend: reason !== null && details.length <= REPORT_DETAILS_MAX,
    send: () => mutation.mutate(),
    isSending: mutation.isPending,
    error: mutation.error ? translateError(mutation.error).message : null,
  };
}
