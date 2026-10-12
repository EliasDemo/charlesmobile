import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { updateSessionUser } from '@/shared/api';
import { applyServerErrors } from '@/shared/ui';
import { formatPeruMobile, peruMobileDigits } from '@/shared/lib';
import { profileKeys, updateProfile, type Profile } from '../api/profileApi';
import {
  birthDateFromIso,
  birthDateToIso,
  editProfileSchema,
  type EditProfileForm,
} from '../schemas/profileSchemas';
import { useProfile } from './useProfile';

const valuesOf = (profile: Profile): EditProfileForm => ({
  fullName: profile.fullName,
  phone: profile.phone ?? '',
  birthDate: birthDateFromIso(profile.birthDate),
  gender: profile.gender ?? '',
});

export function useEditProfile({ onSaved }: { onSaved: () => void }) {
  const queryClient = useQueryClient();
  const { query } = useProfile();
  const form = useForm<EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    mode: 'onTouched',
    defaultValues: { fullName: '', phone: '', birthDate: '', gender: '' },
  });
  const [generalError, setGeneralError] = useState<string | null>(null);

  const loaded = query.data;
  useEffect(() => {
    if (loaded) form.reset(valuesOf(loaded));
    // Only when the saved values change, not on every refetch of the same profile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded?.fullName, loaded?.phone, loaded?.birthDate, loaded?.gender, form]);

  const mutation = useMutation({
    mutationFn: (values: EditProfileForm) => {
      const digits = values.phone.trim() ? peruMobileDigits(values.phone) : null;
      return updateProfile({
        fullName: values.fullName.trim(),
        phone: digits ? formatPeruMobile(digits) : null,
        birthDate: values.birthDate.trim() ? birthDateToIso(values.birthDate) : null,
        gender: values.gender || null,
      });
    },
    onSuccess: (profile: Profile) => {
      queryClient.setQueryData(profileKeys.me, profile);
      updateSessionUser({ fullName: profile.fullName });
      onSaved();
    },
    onError: (error) =>
      setGeneralError(applyServerErrors(error, form.setError, ['fullName', 'phone', 'birthDate', 'gender'])),
  });

  const submit = form.handleSubmit((values) => {
    setGeneralError(null);
    mutation.mutate(values);
  });

  return { query, form, submit, isSubmitting: mutation.isPending, generalError };
}
