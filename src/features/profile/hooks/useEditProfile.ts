import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { updateSessionUser } from '@/shared/api';
import { applyServerErrors } from '@/shared/ui';
import { formatPeruMobile, peruMobileDigits } from '@/shared/lib';
import { profileKeys, updateProfile, type Profile } from '../api/profileApi';
import { editProfileSchema, type EditProfileForm } from '../schemas/profileSchemas';
import { useProfile } from './useProfile';

export function useEditProfile({ onSaved }: { onSaved: () => void }) {
  const queryClient = useQueryClient();
  const { query } = useProfile();
  const form = useForm<EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    mode: 'onTouched',
    defaultValues: { fullName: '', phone: '' },
  });
  const [generalError, setGeneralError] = useState<string | null>(null);

  const loadedName = query.data?.fullName;
  const loadedPhone = query.data?.phone;
  useEffect(() => {
    if (loadedName !== undefined) form.reset({ fullName: loadedName, phone: loadedPhone ?? '' });
  }, [loadedName, loadedPhone, form]);

  const mutation = useMutation({
    mutationFn: (values: EditProfileForm) => {
      const digits = values.phone.trim() ? peruMobileDigits(values.phone) : null;
      return updateProfile({
        fullName: values.fullName.trim(),
        phone: digits ? formatPeruMobile(digits) : null,
      });
    },
    onSuccess: (profile: Profile) => {
      queryClient.setQueryData(profileKeys.me, profile);
      updateSessionUser({ fullName: profile.fullName });
      onSaved();
    },
    onError: (error) => setGeneralError(applyServerErrors(error, form.setError, ['fullName', 'phone'])),
  });

  const submit = form.handleSubmit((values) => {
    setGeneralError(null);
    mutation.mutate(values);
  });

  return { query, form, submit, isSubmitting: mutation.isPending, generalError };
}
