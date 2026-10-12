import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { isApiError } from '@/shared/api';
import { i18n } from '@/shared/i18n';
import { applyServerErrors, showToast } from '@/shared/ui';
import { changePassword } from '../api/profileApi';
import { changePasswordSchema, type ChangePasswordForm } from '../schemas/profileSchemas';

export function useChangePassword({ onDone }: { onDone: () => void }) {
  const form = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onTouched',
    defaultValues: { currentPassword: '', newPassword: '' },
  });
  const [generalError, setGeneralError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      showToast(i18n.t('profile:password.done'));
      onDone();
    },
    onError: (error) => {
      // A 400, not a 401: the session stays.
      if (isApiError(error) && error.code === 'WRONG_PASSWORD') {
        form.setError(
          'currentPassword',
          { type: 'server', message: i18n.t('errors:codes.WRONG_PASSWORD') },
          { shouldFocus: true },
        );
        return;
      }
      setGeneralError(applyServerErrors(error, form.setError, ['currentPassword', 'newPassword']));
    },
  });

  const submit = form.handleSubmit((values) => {
    setGeneralError(null);
    mutation.mutate(values);
  });

  return { form, submit, isSubmitting: mutation.isPending, generalError };
}
