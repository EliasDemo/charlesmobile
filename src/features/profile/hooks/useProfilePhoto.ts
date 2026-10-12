import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { i18n } from '@/shared/i18n';
import { photoForm, photosAvailable, pickPhoto, type PhotoSource } from '@/shared/lib';
import { showToast, translateErrorMessage } from '@/shared/ui';
import { deleteProfilePhoto, profileKeys, uploadProfilePhoto, type Profile } from '../api/profileApi';

/** The account photo: choose or take it (square crop), upload it, or remove it. */
export function useProfilePhoto() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const setPhotoUrl = (photoUrl: string | null) =>
    queryClient.setQueryData<Profile>(profileKeys.me, (profile) =>
      profile ? { ...profile, photoUrl } : profile,
    );

  const upload = useMutation({
    mutationFn: async (source: PhotoSource) => {
      const picked = await pickPhoto(source, [1, 1]);
      if (picked.status !== 'picked') return picked.status;
      return uploadProfilePhoto(photoForm(picked.photo));
    },
    onMutate: () => setMessage(null),
    onSuccess: (result) => {
      if (typeof result === 'object') {
        setPhotoUrl(result.photoUrl);
        showToast(i18n.t('profile:photo.uploaded'));
      } else if (result !== 'cancelled') setMessage(i18n.t(`profile:photo.${result}`));
    },
    onError: (error) => setMessage(translateErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: deleteProfilePhoto,
    onMutate: () => setMessage(null),
    onSuccess: () => {
      setPhotoUrl(null);
      showToast(i18n.t('profile:photo.removed'));
    },
    onError: (error) => setMessage(translateErrorMessage(error)),
  });

  return {
    available: photosAvailable(),
    choose: () => upload.mutate('library'),
    take: () => upload.mutate('camera'),
    remove: () => remove.mutate(),
    busy: upload.isPending || remove.isPending,
    message,
  };
}
