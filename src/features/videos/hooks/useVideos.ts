import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { isApiError, onNextUploadProgress } from '@/shared/api';
import { i18n } from '@/shared/i18n';
import { pickVideo, videoForm, videoPlaybackAvailable, videoUploadAvailable } from '@/shared/lib';
import { showToast, translateErrorMessage } from '@/shared/ui';
import {
  deleteVideo,
  fetchManagedVideos,
  fetchProfileVideos,
  fetchShopVideos,
  reportVideo,
  uploadVideo,
  videoKeys,
  type VideoOwner,
  type VideoReportReason,
} from '../api/videosApi';

/** Limits published in the contract: a barbershop up to 5 videos, a barber up to 10. */
export const VIDEO_LIMIT: Record<VideoOwner['kind'], number> = { shop: 5, me: 10 };

/** While a video is processing, the list is read again every few seconds (3 to 5). */
const PROCESSING_POLL_MS = 4000;

export function useShopVideos(barbershopId: string) {
  return useQuery({ queryKey: videoKeys.shop(barbershopId), queryFn: () => fetchShopVideos(barbershopId) });
}

export function useProfileVideos(profileId: string) {
  return useQuery({ queryKey: videoKeys.profile(profileId), queryFn: () => fetchProfileVideos(profileId) });
}

export type UploadStage = 'idle' | 'compressing' | 'uploading';

/** My videos (barbershop or professional profile): upload, follow the processing, delete. */
export function useManagedVideos(owner: VideoOwner) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: videoKeys.manage(owner),
    queryFn: () => fetchManagedVideos(owner),
    staleTime: 0,
    refetchInterval: (q) =>
      q.state.data?.some((v) => v.status === 'PROCESSING') ? PROCESSING_POLL_MS : false,
  });
  const [stage, setStage] = useState<UploadStage>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: videoKeys.all });

  const upload = useMutation({
    mutationFn: async ({ source, caption }: { source: 'library' | 'camera'; caption: string }) => {
      setMessage(null);
      setStage('compressing');
      setProgress(0);
      const picked = await pickVideo(source, setProgress);
      if (picked.status !== 'picked') return picked.status;
      setStage('uploading');
      setProgress(0);
      onNextUploadProgress(setProgress);
      await uploadVideo(owner, videoForm(picked.video, caption));
      return 'uploaded' as const;
    },
    onSuccess: (status) => {
      if (status === 'uploaded') {
        refresh();
        showToast(i18n.t('videos:processing'));
      } else if (status !== 'cancelled') setMessage(i18n.t(`videos:pick.${status}`));
    },
    onError: (error) =>
      setMessage(
        isApiError(error) && error.code === 'VIDEO_LIMIT_REACHED'
          ? i18n.t('videos:limitReached')
          : translateErrorMessage(error),
      ),
    onSettled: () => setStage('idle'),
  });
  const remove = useMutation({
    mutationFn: deleteVideo,
    onSuccess: refresh,
    onError: (error) => setMessage(translateErrorMessage(error)),
  });

  return {
    query,
    canUpload: videoUploadAvailable(),
    canPlay: videoPlaybackAvailable(),
    upload: (source: 'library' | 'camera', caption = '') => upload.mutate({ source, caption }),
    stage,
    progress,
    remove: (id: string) => remove.mutate(id),
    message,
  };
}

export function useReportVideo() {
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: VideoReportReason }) => reportVideo(id, reason),
    onSuccess: () => showToast(i18n.t('videos:report.sent')),
    onError: (error) =>
      showToast(
        isApiError(error) && error.code === 'ALREADY_REPORTED'
          ? i18n.t('videos:report.already')
          : translateErrorMessage(error),
      ),
  });
}
