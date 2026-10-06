import { Controller } from 'react-hook-form';
import { useTranslation } from '@/shared/i18n';
import { Button, Notice, PasswordField, Screen, Text, TextField, useFieldErrorText } from '@/shared/ui';
import { PasswordRequirements } from '../components/PasswordRequirements';
import { useResetPassword } from '../hooks/usePasswordReset';

export interface ResetPasswordScreenProps {
  email: string;
  onDone: () => void;
  /** Back to step 1 to ask for another code. */
  onResend: () => void;
}

export function ResetPasswordScreen({ email, onDone, onResend }: ResetPasswordScreenProps) {
  const { t } = useTranslation('auth');
  const errorText = useFieldErrorText('auth');
  const { form, submit, isSubmitting, generalError } = useResetPassword({ email, onDone });
  return (
    <Screen>
      <Text variant="title">{t('reset.title')}</Text>
      <Text color="textSecondary">{t('reset.subtitle', { email })}</Text>
      <Notice tone="success" message={t('forgot.sent')} />
      {generalError ? <Notice tone="danger" message={generalError} /> : null}
      <Controller
        control={form.control}
        name="code"
        render={({ field, fieldState }) => (
          <TextField
            label={t('fields.code')}
            placeholder={t('fields.codePlaceholder')}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
            error={errorText(fieldState.error?.message)}
          />
        )}
      />
      <Controller
        control={form.control}
        name="newPassword"
        render={({ field, fieldState }) => (
          <PasswordField
            purpose="new"
            label={t('fields.newPassword')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
            error={errorText(fieldState.error?.message)}
            footer={<PasswordRequirements password={field.value} />}
          />
        )}
      />
      <Notice tone="warning" message={t('reset.warning')} />
      <Button label={t('reset.submit')} onPress={() => void submit()} loading={isSubmitting} fullWidth />
      <Button label={t('reset.resend')} variant="ghost" onPress={onResend} />
    </Screen>
  );
}
