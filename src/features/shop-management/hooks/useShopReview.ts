import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { isApiError, translateError } from '@/shared/api';
import { fetchReview, shopKeys, submitReview, type ShopStatus } from '../api/shopApi';

/** States of a barbershop that is not yet public (ALTA.md). */
export const REVIEW_STATES: readonly ShopStatus[] = ['DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED'];

export type Requirement = 'OWNER_DOCUMENT' | 'PHOTO';

/**
 * Review before publishing: what is missing, the support notes and sending it. Whether it can be
 * sent comes from the API (`canSubmit`); only the main owner sends it (the backend checks again).
 */
export function useShopReview(shopId: string) {
  const queryClient = useQueryClient();
  const review = useQuery({
    queryKey: shopKeys.review(shopId),
    queryFn: () => fetchReview(shopId),
    staleTime: 0,
  });
  // Requirements reported by a rejected submit, in case the review data was stale.
  const [missingFromSubmit, setMissingFromSubmit] = useState<Requirement[] | null>(null);

  const submit = useMutation({
    mutationFn: () => submitReview(shopId),
    onMutate: () => setMissingFromSubmit(null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: shopKeys.review(shopId) });
      void queryClient.invalidateQueries({ queryKey: shopKeys.detail(shopId) });
      void queryClient.invalidateQueries({ queryKey: shopKeys.mine });
    },
    onError: (error) => {
      if (isApiError(error) && error.code === 'REVIEW_REQUIREMENTS_MISSING') {
        setMissingFromSubmit(
          error.details
            .map((d) => d.requirement)
            .filter((r): r is Requirement => r === 'OWNER_DOCUMENT' || r === 'PHOTO'),
        );
      }
      void queryClient.invalidateQueries({ queryKey: shopKeys.review(shopId) });
    },
  });

  const missing = missingFromSubmit ?? review.data?.missingRequirements ?? [];
  const submitError =
    submit.error && !(isApiError(submit.error) && submit.error.code === 'REVIEW_REQUIREMENTS_MISSING')
      ? translateError(submit.error).message
      : null;

  return {
    review,
    missing,
    submit: () => submit.mutate(),
    isSubmitting: submit.isPending,
    submitted: submit.isSuccess,
    submitError,
  };
}
