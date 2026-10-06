import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { clearSession, queryClient } from '@/shared/api';
import { applyServerErrors } from '@/shared/ui';
import { confirmPasswordReset, requestPasswordReset } from '../api/authApi';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordForm,
  type ResetPasswordForm,
} from '../schemas/authSchemas';

/** Step 1: ask for a code. The answer is the same whether the account exists or not. */
export function useForgotPassword({ onSent }: { onSent: (email: string) => void }) {
  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onTouched',
    defaultValues: { email: '' },
  });
  const [generalError, setGeneralError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (values: ForgotPasswordForm) => requestPasswordReset(values.email),
    onSuccess: (_data, values) => onSent(values.email),
    onError: (error) => setGeneralError(applyServerErrors(error, form.setError, ['email'])),
  });
  const submit = form.handleSubmit((values) => {
    setGeneralError(null);
    mutation.mutate(values);
  });
  return { form, submit, isSubmitting: mutation.isPending, generalError };
}

/** Step 2: code and new password. The backend closes every session of the account. */
export function useResetPassword({ email, onDone }: { email: string; onDone: () => void }) {
  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onTouched',
    defaultValues: { code: '', newPassword: '' },
  });
  const [generalError, setGeneralError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (values: ResetPasswordForm) =>
      confirmPasswordReset({ email, code: values.code, newPassword: values.newPassword }),
    onSuccess: async () => {
      // This device's session was closed too: forget it locally.
      queryClient.clear();
      await clearSession();
      onDone();
    },
    onError: (error) => setGeneralError(applyServerErrors(error, form.setError, ['code', 'newPassword'])),
  });
  const submit = form.handleSubmit((values) => {
    setGeneralError(null);
    mutation.mutate(values);
  });
  return { form, submit, isSubmitting: mutation.isPending, generalError };
}
