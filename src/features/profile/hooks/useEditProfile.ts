import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { updateSessionUser } from '@/shared/api';
import { applyServerErrors } from '@/shared/ui';
import { profileKeys, updateFullName, type Profile } from '../api/profileApi';
import { editProfileSchema, type EditProfileForm } from '../schemas/profileSchemas';
import { useProfile } from './useProfile';

export function useEditProfile({ onSaved }: { onSaved: () => void }) {
  const queryClient = useQueryClient();
  const { query } = useProfile();
  const form = useForm<EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    mode: 'onTouched',
    defaultValues: { fullName: '' },
  });
  const [generalError, setGeneralError] = useState<string | null>(null);

  const loadedName = query.data?.fullName;
  useEffect(() => {
    if (loadedName !== undefined) form.reset({ fullName: loadedName });
  }, [loadedName, form]);

  const mutation = useMutation({
    mutationFn: (values: EditProfileForm) => updateFullName(values.fullName.trim()),
    onSuccess: (profile: Profile) => {
      queryClient.setQueryData(profileKeys.me, profile);
      updateSessionUser({ fullName: profile.fullName });
      onSaved();
    },
    onError: (error) => setGeneralError(applyServerErrors(error, form.setError, ['fullName'])),
  });

  const submit = form.handleSubmit((values) => {
    setGeneralError(null);
    mutation.mutate(values);
  });

  return { query, form, submit, isSubmitting: mutation.isPending, generalError };
}
