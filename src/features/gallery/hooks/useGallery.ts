import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { nextPageParam, translateError, useSession } from '@/shared/api';
import { i18n } from '@/shared/i18n';
import { showToast } from '@/shared/ui';
import {
  fetchGallery,
  fetchStyles,
  galleryKeys,
  reportImage,
  type GalleryImage,
  type GalleryPage,
  type ImageReportReason,
} from '../api/galleryApi';

export const REPORT_REASONS: ImageReportReason[] = [
  'NOT_MY_PHOTO',
  'NO_CONSENT',
  'INAPPROPRIATE',
  'MISLEADING',
  'OTHER',
];
export const REPORT_DETAILS_MAX = 500;

/** Highlighted photos first (only in the first page), then the rest, newest first. */
export function useGallery(shopId: string) {
  const query = useInfiniteQuery({
    queryKey: galleryKeys.shop(shopId),
    queryFn: ({ pageParam }) => fetchGallery(shopId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: GalleryPage) => nextPageParam(last),
  });
  const photos = query.data
    ? [...(query.data.pages[0]?.pinned ?? []), ...query.data.pages.flatMap((p) => p.items)]
    : undefined;
  const [open, setOpen] = useState<GalleryImage | null>(null);
  return {
    list: {
      items: photos,
      error: query.error,
      hasNextPage: query.hasNextPage,
      isFetchingNextPage: query.isFetchingNextPage,
      isRefetching: query.isRefetching,
      fetchNextPage: query.fetchNextPage,
      refetch: query.refetch,
    },
    query,
    photos: photos ?? [],
    open,
    show: setOpen,
    close: () => setOpen(null),
  };
}

/** Styles to tag photos, choose specialties and filter the search. */
export function useStyles() {
  return useQuery({ queryKey: galleryKeys.styles, queryFn: fetchStyles, staleTime: Infinity });
}

/** Report a photo (once per person; the barbershop cannot report its own). */
export function useReportImage(imageId: string | null) {
  const authenticated = useSession((s) => s.status === 'authenticated');
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ImageReportReason | null>(null);
  const [details, setDetails] = useState('');
  const mutation = useMutation({
    mutationFn: () => reportImage(imageId!, reason!, details),
    onSuccess: () => {
      setOpen(false);
      showToast(i18n.t('gallery:report.sent'));
    },
  });
  return {
    canReport: authenticated && imageId !== null,
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
