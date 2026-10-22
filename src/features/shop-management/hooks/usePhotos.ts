import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { nextPageParam, translateError } from '@/shared/api';
import { i18n } from '@/shared/i18n';
import {
  measurePhoto,
  measurementFields,
  photoForm,
  photosAvailable,
  pickPhoto,
  type PhotoSource,
  type PickedPhoto,
} from '@/shared/lib';
import { showToast } from '@/shared/ui';
import {
  deleteBarberPhoto,
  deleteCover,
  deleteGalleryImage,
  deleteLogo,
  fetchManagedGallery,
  shopKeys,
  updateGalleryImage,
  uploadBarberPhoto,
  uploadCover,
  uploadGalleryImage,
  uploadLogo,
  type GalleryUpdateBody,
  type ManagedGalleryImage,
  type ManagedGalleryPage,
} from '../api/shopApi';

/** Limits published in the contract (GalleryUploadDto / UpdateGalleryImageDto). */
export const CAPTION_MAX = 200;
export const GALLERY_STYLES_MAX = 3;

export type PhotoKind = 'cover' | 'logo' | 'barber';

const ASPECT: Record<PhotoKind, [number, number]> = { cover: [16, 9], logo: [1, 1], barber: [1, 1] };

/** Why a pick did not give a photo, as a text for the screen (null when cancelled). */
const pickMessage = (status: 'denied' | 'unavailable' | 'cancelled') =>
  status === 'cancelled' ? null : i18n.t(`shop:photos.${status}`);

/**
 * One photo of the barbershop (cover or logo) or of a barber: choose or take it, upload it,
 * or remove it. The cover is also the "foto del local" that the review asks for.
 */
export function usePhoto({ shopId, kind, barberId }: { shopId: string; kind: PhotoKind; barberId?: string }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: shopKeys.all });
    // Public detail and search show the new photo too.
    void queryClient.invalidateQueries({ queryKey: ['barbershop'] });
  };
  const upload = useMutation({
    mutationFn: async (source: PhotoSource) => {
      const picked = await pickPhoto(source, ASPECT[kind]);
      if (picked.status !== 'picked') return picked.status;
      const form = photoForm(picked.photo);
      if (kind === 'cover') await uploadCover(shopId, form);
      else if (kind === 'logo') await uploadLogo(shopId, form);
      else await uploadBarberPhoto(shopId, barberId!, form);
      return 'uploaded' as const;
    },
    onMutate: () => setMessage(null),
    onSuccess: (status) => {
      if (status === 'uploaded') {
        refresh();
        showToast(i18n.t('shop:photos.uploaded'));
      } else setMessage(pickMessage(status));
    },
  });
  const remove = useMutation({
    mutationFn: async () => {
      if (kind === 'cover') await deleteCover(shopId);
      else if (kind === 'logo') await deleteLogo(shopId);
      else await deleteBarberPhoto(shopId, barberId!);
    },
    onSuccess: refresh,
  });
  const error = upload.error ?? remove.error;
  return {
    /** The installed build has no photo modules yet (they come with the next build). */
    available: photosAvailable(),
    choose: () => upload.mutate('library'),
    take: () => upload.mutate('camera'),
    remove: () => remove.mutate(),
    busy: upload.isPending || remove.isPending,
    message: message ?? (error ? translateError(error).message : null),
  };
}

/** Gallery for management (all, or one barber's), with hidden or removed photos. */
export function useManagedGallery(shopId: string, barberId: string | null) {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: shopKeys.gallery(shopId, barberId),
    queryFn: ({ pageParam }) => fetchManagedGallery(shopId, barberId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: ManagedGalleryPage) => nextPageParam(last),
    staleTime: 0,
  });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['shop-management', shopId, 'gallery'] });
    void queryClient.invalidateQueries({ queryKey: ['gallery', shopId] });
  };
  const [editing, setEditing] = useState<ManagedGalleryImage | null>(null);
  const [deleting, setDeleting] = useState<ManagedGalleryImage | null>(null);
  const update = useMutation({
    mutationFn: ({ image, body }: { image: ManagedGalleryImage; body: GalleryUpdateBody }) =>
      updateGalleryImage(shopId, image.id, body),
    onSuccess: () => {
      setEditing(null);
      refresh();
      showToast(i18n.t('shop:gallery.saved'));
    },
  });
  const remove = useMutation({
    mutationFn: (image: ManagedGalleryImage) => deleteGalleryImage(shopId, image.id),
    onSuccess: () => {
      setDeleting(null);
      setEditing(null);
      refresh();
    },
    onError: () => setDeleting(null),
  });
  const error = update.error ?? remove.error;
  return {
    query,
    photos: query.data?.pages.flatMap((p) => p.items) ?? [],
    refresh,
    editing,
    edit: (image: ManagedGalleryImage) => {
      update.reset();
      setEditing(image);
    },
    closeEdit: () => setEditing(null),
    save: (image: ManagedGalleryImage, body: GalleryUpdateBody) => update.mutate({ image, body }),
    togglePin: (image: ManagedGalleryImage) => update.mutate({ image, body: { pinned: !image.pinned } }),
    isSaving: update.isPending,
    deleting,
    askDelete: setDeleting,
    cancelDelete: () => setDeleting(null),
    confirmDelete: () => deleting && remove.mutate(deleting),
    isDeleting: remove.isPending,
    error: error ? translateError(error).message : null,
  };
}

/**
 * New gallery photo: pick it, then consent (required), caption, up to 3 styles and the service
 * for "Reservar este estilo". Uploaded for one barber of the barbershop.
 */
export function useGalleryUpload({
  shopId,
  barberId: fixedBarberId,
  onDone,
}: {
  shopId: string;
  /** A barber uploading to their own gallery. */
  barberId?: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [barberId, setBarberId] = useState<string | null>(fixedBarberId ?? null);
  const [consent, setConsent] = useState(false);
  const [caption, setCaption] = useState('');
  const [styleIds, setStyleIds] = useState<string[]>([]);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const pick = async (source: PhotoSource) => {
    setMessage(null);
    const result = await pickPhoto(source);
    if (result.status === 'picked') setPhoto(result.photo);
    else setMessage(pickMessage(result.status));
  };
  const upload = useMutation({
    mutationFn: async () => {
      // The 4 face measurements, computed on the phone (never the face points).
      const fields: Record<string, string> = {
        consent: 'true',
        ...measurementFields(await measurePhoto(photo!.uri)),
      };
      if (caption.trim()) fields.caption = caption.trim();
      if (styleIds.length) fields.styleIds = styleIds.join(',');
      if (serviceId) fields.serviceId = serviceId;
      return uploadGalleryImage(shopId, barberId!, photoForm(photo!, fields));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shop-management', shopId, 'gallery'] });
      void queryClient.invalidateQueries({ queryKey: ['gallery', shopId] });
      showToast(i18n.t('shop:photos.uploaded'));
      onDone();
    },
  });
  return {
    available: photosAvailable(),
    photo,
    choose: () => void pick('library'),
    take: () => void pick('camera'),
    barberId,
    setBarberId,
    consent,
    setConsent,
    caption,
    setCaption,
    styleIds,
    toggleStyle: (id: string) =>
      setStyleIds((ids) =>
        ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < GALLERY_STYLES_MAX ? [...ids, id] : ids,
      ),
    serviceId,
    setServiceId,
    canSend: photo !== null && barberId !== null && consent && caption.length <= CAPTION_MAX,
    send: () => upload.mutate(),
    isSending: upload.isPending,
    message: message ?? (upload.error ? translateError(upload.error).message : null),
  };
}
