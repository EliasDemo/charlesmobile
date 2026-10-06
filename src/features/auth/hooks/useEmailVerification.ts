import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { refreshSession, updateSessionUser, useSession } from '@/shared/api';
import { useCountdown } from '@/shared/lib';
import { applyServerErrors } from '@/shared/ui';
import { confirmEmailCode, requestEmailCode } from '../api/authApi';
import { codeSchema, type CodeForm } from '../schemas/authSchemas';

/** Waiting time between "resend code" taps. The backend also limits requests. */
export const RESEND_COOLDOWN_SECONDS = 60;

export function useEmailVerification({ onVerified }: { onVerified: () => void }) {
  const user = useSession((s) => s.user);
  const form = useForm<CodeForm>({
    resolver: zodResolver(codeSchema),
    mode: 'onTouched',
    defaultValues: { code: '' },
  });
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const cooldown = useCountdown();

  const confirm = useMutation({
    mutationFn: (values: CodeForm) => confirmEmailCode(values.code),
    onSuccess: async () => {
      updateSessionUser({ emailVerified: true });
      // New tokens carry the updated account state. A failure here is not the user's problem.
      await refreshSession().catch(() => undefined);
      onVerified();
    },
    onError: (error) => setGeneralError(applyServerErrors(error, form.setError, ['code'])),
  });

  const resend = useMutation({
    mutationFn: requestEmailCode,
    onMutate: () => {
      setGeneralError(null);
      setResent(false);
    },
    onSuccess: () => {
      setResent(true);
      cooldown.start(RESEND_COOLDOWN_SECONDS);
    },
    onError: (error) => setGeneralError(applyServerErrors(error, form.setError, [])),
  });

  const submit = form.handleSubmit((values) => {
    setGeneralError(null);
    confirm.mutate(values);
  });

  return {
    form,
    submit,
    alreadyVerified: user?.emailVerified === true,
    isSubmitting: confirm.isPending,
    generalError,
    resend: () => resend.mutate(),
    isResending: resend.isPending,
    resent,
    resendSecondsLeft: cooldown.secondsLeft,
  };
}
