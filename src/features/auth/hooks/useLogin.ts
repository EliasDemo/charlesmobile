import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { isApiError, queryClient, startSession, translateError, type SessionUser } from '@/shared/api';
import { deviceModelName, useCountdown } from '@/shared/lib';
import { applyServerErrors } from '@/shared/ui';
import { login, supportAccess } from '../api/authApi';
import { loginSchema, type LoginForm } from '../schemas/authSchemas';
import { useRestrictedAccess } from './usePendingDeletion';

export interface UseLoginOptions {
  /** Called with the signed-in user and the email typed; the route decides where to go next. */
  onSuccess: (user: SessionUser, email: string) => void;
  /** The account is pending deletion: the restricted access is ready to cancel it. */
  onPendingDeletion: () => void;
  /** The account is disabled: the restricted access only opens the support screens. */
  onDisabled: () => void;
}

export function useLogin({ onSuccess, onPendingDeletion, onDisabled }: UseLoginOptions) {
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  });
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [lockedWithoutTime, setLockedWithoutTime] = useState(false);
  const lock = useCountdown();

  const pendingAccess = useMutation({
    mutationFn: (values: LoginForm) => supportAccess({ email: values.email, password: values.password }),
    onSuccess: (access) => {
      useRestrictedAccess.getState().set(access.accessToken, access.scope);
      if (access.scope === 'support') onDisabled();
      else onPendingDeletion();
    },
    onError: (error) => setGeneralError(translateError(error).message),
  });

  const mutation = useMutation({
    mutationFn: (values: LoginForm) =>
      login({ email: values.email, password: values.password, deviceName: deviceModelName() }),
    onSuccess: async (tokens, values) => {
      await startSession(tokens);
      // Public data read as a visitor (e.g. isFavorite) is now per account: read it again.
      void queryClient.invalidateQueries();
      onSuccess(tokens.user, values.email);
    },
    onError: (error, values) => {
      if (
        isApiError(error) &&
        (error.code === 'ACCOUNT_PENDING_DELETION' || error.code === 'ACCOUNT_DISABLED')
      ) {
        // Same email and password give a restricted access: cancel the deletion, or write to support.
        pendingAccess.mutate(values);
        return;
      }
      if (isApiError(error) && error.code === 'ACCOUNT_LOCKED') {
        const seconds = error.details[0]?.retryAfterSeconds;
        if (typeof seconds === 'number' && seconds > 0) lock.start(seconds);
        else setLockedWithoutTime(true);
        setGeneralError(null);
        return;
      }
      setGeneralError(applyServerErrors(error, form.setError, ['email', 'password']));
    },
  });

  const submit = form.handleSubmit((values) => {
    setGeneralError(null);
    setLockedWithoutTime(false);
    mutation.mutate(values);
  });

  return {
    form,
    submit,
    isSubmitting: mutation.isPending || pendingAccess.isPending,
    generalError,
    /** Seconds until the account can try again (ACCOUNT_LOCKED), 0 when not locked. */
    lockedSeconds: lock.secondsLeft,
    lockedWithoutTime,
  };
}
