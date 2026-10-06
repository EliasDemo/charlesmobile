import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { isApiError, startSession, type SessionUser } from '@/shared/api';
import { deviceModelName, useCountdown } from '@/shared/lib';
import { applyServerErrors } from '@/shared/ui';
import { login } from '../api/authApi';
import { loginSchema, type LoginForm } from '../schemas/authSchemas';

export interface UseLoginOptions {
  /** Called with the signed-in user; the route decides where to go next. */
  onSuccess: (user: SessionUser) => void;
}

export function useLogin({ onSuccess }: UseLoginOptions) {
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  });
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [lockedWithoutTime, setLockedWithoutTime] = useState(false);
  const lock = useCountdown();

  const mutation = useMutation({
    mutationFn: (values: LoginForm) =>
      login({ email: values.email, password: values.password, deviceName: deviceModelName() }),
    onSuccess: async (tokens) => {
      await startSession(tokens);
      onSuccess(tokens.user);
    },
    onError: (error) => {
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
    isSubmitting: mutation.isPending,
    generalError,
    /** Seconds until the account can try again (ACCOUNT_LOCKED), 0 when not locked. */
    lockedSeconds: lock.secondsLeft,
    lockedWithoutTime,
  };
}
