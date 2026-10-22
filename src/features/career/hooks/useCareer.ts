import { zodResolver } from '@hookform/resolvers/zod';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { isApiError, nextPageParam, refreshSession } from '@/shared/api';
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
import { applyServerErrors, showToast, translateErrorMessage } from '@/shared/ui';
import {
  careerKeys,
  deletePortfolioItem,
  deleteProfilePhoto,
  fetchMyProfile,
  fetchPortfolio,
  fetchProfile,
  fetchProfileReviews,
  fetchRanking,
  leaveWorkplace,
  saveMyProfile,
  saveSpecialties,
  uploadPortfolioItem,
  uploadProfilePhoto,
  type BarberProfile,
  type PortfolioPage,
  type ProfileReviewPage,
  type RankingFilters,
  type RankingPage,
} from '../api/careerApi';
import { profileSchema, type ProfileForm } from '../schemas/careerSchemas';

/** Limits published in the contract (SetProfileSpecialtiesDto, PortfolioUploadDto). */
export const SPECIALTIES_MAX = 10;
export const PORTFOLIO_STYLES_MAX = 5;
export const CAPTION_MAX = 200;

function listOf<P extends { items: unknown[] }>(query: UseInfiniteQueryResult<InfiniteData<P>>) {
  return {
    items: query.data?.pages.flatMap((p) => p.items) as P['items'] | undefined,
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isRefetching: query.isRefetching,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}

/** The account's professional profile (null: not created yet). */
export function useMyCareerProfile() {
  return useQuery({ queryKey: careerKeys.mine, queryFn: fetchMyProfile, staleTime: 0 });
}

function useRefreshMine() {
  const queryClient = useQueryClient();
  return (profile?: BarberProfile) => {
    if (profile) queryClient.setQueryData(careerKeys.mine, profile);
    void queryClient.invalidateQueries({ queryKey: careerKeys.all });
  };
}

/** Create or edit. Creating grants the BARBER role, so the session is renewed to carry it. */
export function useCareerProfileForm({ onSaved }: { onSaved: () => void }) {
  const mine = useMyCareerProfile();
  const refresh = useRefreshMine();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    mode: 'onTouched',
    defaultValues: {
      displayName: '',
      headline: '',
      bio: '',
      yearsExperience: '',
      district: '',
      availableForWork: false,
    },
  });
  const loaded = mine.data;
  useEffect(() => {
    if (!loaded) return;
    form.reset({
      displayName: loaded.displayName,
      headline: loaded.headline ?? '',
      bio: loaded.bio ?? '',
      yearsExperience: loaded.yearsExperience?.toString() ?? '',
      district: loaded.district ?? '',
      availableForWork: loaded.availableForWork,
    });
    // Only when the saved profile changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded?.id, loaded?.displayName, loaded?.headline]);

  const creating = mine.data === null;
  const mutation = useMutation({
    mutationFn: async (values: ProfileForm) => {
      const text = (value: string) => (value.trim() ? value.trim() : null);
      const profile = await saveMyProfile({
        displayName: values.displayName.trim(),
        headline: text(values.headline),
        bio: text(values.bio),
        yearsExperience: values.yearsExperience.trim() ? Number(values.yearsExperience) : null,
        district: text(values.district),
        availableForWork: values.availableForWork,
      });
      if (creating) await refreshSession().catch(() => undefined);
      return profile;
    },
    onSuccess: (profile) => {
      refresh(profile);
      showToast(i18n.t(creating ? 'career:form.created' : 'career:form.saved'));
      onSaved();
    },
    onError: (error) =>
      setGeneralError(
        applyServerErrors(error, form.setError, [
          'displayName',
          'headline',
          'bio',
          'yearsExperience',
          'district',
        ]),
      ),
  });
  return {
    mine,
    creating,
    form,
    submit: form.handleSubmit((values) => {
      setGeneralError(null);
      mutation.mutate(values);
    }),
    isSubmitting: mutation.isPending,
    generalError,
  };
}

export function useCareerPhoto() {
  const refresh = useRefreshMine();
  const [message, setMessage] = useState<string | null>(null);
  const upload = useMutation({
    mutationFn: async (source: PhotoSource) => {
      const picked = await pickPhoto(source, [1, 1]);
      if (picked.status !== 'picked') return picked.status;
      await uploadProfilePhoto(photoForm(picked.photo));
      return 'uploaded' as const;
    },
    onMutate: () => setMessage(null),
    onSuccess: (status) => {
      if (status === 'uploaded') {
        refresh();
        showToast(i18n.t('profile:photo.uploaded'));
      } else if (status !== 'cancelled') setMessage(i18n.t(`profile:photo.${status}`));
    },
    onError: (error) => setMessage(translateErrorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: deleteProfilePhoto,
    onSuccess: () => refresh(),
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

export function useSpecialtiesEditor({ onSaved }: { onSaved: () => void }) {
  const mine = useMyCareerProfile();
  const refresh = useRefreshMine();
  const [selected, setSelected] = useState<string[] | null>(null);
  const current = selected ?? mine.data?.specialties.map((s) => s.id) ?? [];
  const mutation = useMutation({
    mutationFn: () => saveSpecialties(current),
    onSuccess: (profile) => {
      refresh(profile);
      onSaved();
    },
  });
  return {
    mine,
    selected: current,
    toggle: (id: string) =>
      setSelected(
        current.includes(id)
          ? current.filter((s) => s !== id)
          : current.length < SPECIALTIES_MAX
            ? [...current, id]
            : current,
      ),
    save: () => mutation.mutate(),
    isSaving: mutation.isPending,
    error: mutation.error ? translateErrorMessage(mutation.error) : null,
  };
}

/** A cut for the portfolio: photo, caption, styles and the consent of the person photographed. */
export function usePortfolioUpload({ onUploaded }: { onUploaded: () => void }) {
  const refresh = useRefreshMine();
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [caption, setCaption] = useState('');
  const [styleIds, setStyleIds] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const upload = useMutation({
    mutationFn: async () => {
      const fields: Record<string, string> = {
        consent: 'true',
        ...measurementFields(await measurePhoto(photo!.uri)),
      };
      if (caption.trim()) fields.caption = caption.trim();
      if (styleIds.length) fields.styleIds = styleIds.join(',');
      return uploadPortfolioItem(photoForm(photo!, fields));
    },
    onSuccess: () => {
      refresh();
      showToast(i18n.t('career:portfolio.uploaded'));
      onUploaded();
    },
    onError: (error) => setMessage(translateErrorMessage(error)),
  });
  return {
    available: photosAvailable(),
    photo,
    pick: async (source: PhotoSource) => {
      setMessage(null);
      const result = await pickPhoto(source);
      if (result.status === 'picked') setPhoto(result.photo);
      else if (result.status !== 'cancelled') setMessage(i18n.t(`profile:photo.${result.status}`));
    },
    caption,
    setCaption,
    styleIds,
    toggleStyle: (id: string) =>
      setStyleIds((current) =>
        current.includes(id)
          ? current.filter((s) => s !== id)
          : current.length < PORTFOLIO_STYLES_MAX
            ? [...current, id]
            : current,
      ),
    consent,
    setConsent,
    /** The consent box is required by the backend (consent=true). */
    canUpload: Boolean(photo) && consent && !upload.isPending,
    upload: () => upload.mutate(),
    isUploading: upload.isPending,
    message,
  };
}

export function useDeletePortfolioItem() {
  const refresh = useRefreshMine();
  return useMutation({ mutationFn: deletePortfolioItem, onSuccess: () => refresh() });
}

export function useLeaveWorkplace() {
  const refresh = useRefreshMine();
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: leaveWorkplace,
    onSuccess: (profile) => {
      refresh(profile);
      showToast(i18n.t('career:workplaces.left'));
    },
    onError: (err) =>
      setError(
        isApiError(err) && err.code === 'HAS_FUTURE_BOOKINGS'
          ? i18n.t('career:workplaces.hasBookings')
          : translateErrorMessage(err),
      ),
  });
  return {
    leave: (barberId: string) => {
      setError(null);
      mutation.mutate(barberId);
    },
    isLeaving: mutation.isPending,
    error,
  };
}

export function usePublicCareerProfile(id: string) {
  return useQuery({ queryKey: careerKeys.profile(id), queryFn: () => fetchProfile(id) });
}

export function usePortfolio(id: string, style?: string) {
  return listOf(
    useInfiniteQuery({
      queryKey: careerKeys.portfolio(id, style),
      queryFn: ({ pageParam }) => fetchPortfolio(id, pageParam, style),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last: PortfolioPage) => nextPageParam(last),
    }),
  );
}

export function useProfileReviews(id: string) {
  return listOf(
    useInfiniteQuery({
      queryKey: careerKeys.reviews(id),
      queryFn: ({ pageParam }) => fetchProfileReviews(id, pageParam),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last: ProfileReviewPage) => nextPageParam(last),
    }),
  );
}

/** The ranking pages by offset: `nextOffset` null means there are no more. */
export function useRanking(filters: RankingFilters) {
  return listOf(
    useInfiniteQuery({
      queryKey: careerKeys.ranking(filters),
      queryFn: ({ pageParam }) => fetchRanking(filters, pageParam),
      initialPageParam: 0,
      getNextPageParam: (last: RankingPage) => last.nextOffset ?? undefined,
    }),
  );
}
