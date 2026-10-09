import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { isApiError } from '@/shared/api';
import { parseOptionalUrl } from '@/shared/config';
import { i18n } from '@/shared/i18n';
import { applyServerErrors } from '@/shared/ui';
import { authKeys, fetchTerms, register } from '../api/authApi';
import {
  formatPeruMobile,
  peruMobileDigits,
  registerSchema,
  type RegisterForm,
} from '../schemas/authSchemas';

export interface UseRegisterOptions {
  /** The backend answers the same whether the email existed or not. */
  onSuccess: () => void;
}

const FIELDS = ['fullName', 'email', 'password', 'phone', 'declaresAdult', 'acceptTerms'] as const;

export function useRegister({ onSuccess }: UseRegisterOptions) {
  const terms = useQuery({ queryKey: authKeys.terms, queryFn: fetchTerms, staleTime: 0 });
  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      phone: '',
      declaresAdult: false,
      acceptTerms: false,
    },
  });
  const [generalError, setGeneralError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (values: RegisterForm & { termsVersion: string }) => {
      const digits = values.phone.trim() ? peruMobileDigits(values.phone) : null;
      return register({
        fullName: values.fullName.trim(),
        email: values.email,
        password: values.password,
        ...(digits ? { phone: formatPeruMobile(digits) } : {}),
        acceptTerms: values.acceptTerms,
        declaresAdult: values.declaresAdult,
        termsVersion: values.termsVersion,
      });
    },
    onSuccess,
    onError: (error) => {
      if (isApiError(error) && error.code === 'TERMS_VERSION_OUTDATED') {
        // The user must see and accept the new version.
        form.setValue('acceptTerms', false);
        void terms.refetch();
        setGeneralError(i18n.t('auth:register.termsChanged'));
        return;
      }
      setGeneralError(applyServerErrors(error, form.setError, FIELDS));
    },
  });

  const submit = form.handleSubmit((values) => {
    const termsVersion = terms.data?.version;
    if (!termsVersion) return;
    setGeneralError(null);
    mutation.mutate({ ...values, termsVersion });
  });

  return {
    form,
    submit,
    isSubmitting: mutation.isPending,
    generalError,
    terms,
    // Links from GET /auth/terms; shown only when the API sends them.
    termsUrl: parseOptionalUrl(terms.data?.termsUrl),
    privacyUrl: parseOptionalUrl(terms.data?.privacyUrl),
  };
}
