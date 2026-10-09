import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { clearSession, isApiError, queryClient } from '@/shared/api';
import { i18n } from '@/shared/i18n';
import { applyServerErrors } from '@/shared/ui';
import { deletionKeys, fetchDeletionPreview, requestDeletion } from '../api/accountDeletionApi';

const schema = z.object({ password: z.string().min(1, { error: 'validation.passwordRequired' }) });
type Form = z.infer<typeof schema>;

/**
 * "Eliminar mi cuenta": the preview from the API decides what can be done (blockers, bookings to
 * cancel and their refunds, deletion date); the user confirms with the password.
 */
export function useDeleteAccount({ onDeleted }: { onDeleted: (scheduledFor: string | null) => void }) {
  const preview = useQuery({ queryKey: deletionKeys.preview, queryFn: fetchDeletionPreview, staleTime: 0 });
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { password: '' },
  });
  const [generalError, setGeneralError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (values: Form) => requestDeletion(values.password),
    onSuccess: async (status) => {
      // The backend closed every session: forget this one now.
      queryClient.clear();
      await clearSession();
      onDeleted(status.scheduledFor);
    },
    onError: (error) => {
      if (isApiError(error) && error.code === 'INVALID_CREDENTIALS') {
        form.setError('password', { type: 'server', message: i18n.t('profile:deletion.wrongPassword') });
        return;
      }
      if (isApiError(error) && error.code === 'DELETION_BLOCKED') {
        // Something changed meanwhile (e.g. became sole owner): show the current blockers.
        void preview.refetch();
      }
      setGeneralError(applyServerErrors(error, form.setError, ['password']));
    },
  });

  return {
    preview,
    form,
    canRequest: preview.data?.canRequest === true,
    submit: form.handleSubmit((values) => {
      setGeneralError(null);
      mutation.mutate(values);
    }),
    isSubmitting: mutation.isPending,
    generalError,
  };
}
