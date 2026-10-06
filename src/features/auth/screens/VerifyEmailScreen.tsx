import { Controller } from 'react-hook-form';
import { useTranslation } from '@/shared/i18n';
import { Button, Notice, Screen, Text, TextField, useFieldErrorText } from '@/shared/ui';
import { useEmailVerification } from '../hooks/useEmailVerification';

export interface VerifyEmailScreenProps {
  /** Shown in the explanation when known (comes from the login form). */
  email?: string;
  onVerified: () => void;
  onLater: () => void;
}

export function VerifyEmailScreen({ email, onVerified, onLater }: VerifyEmailScreenProps) {
  const { t } = useTranslation('auth');
  const errorText = useFieldErrorText('auth');
  const {
    form,
    submit,
    isSubmitting,
    generalError,
    resend,
    isResending,
    resent,
    resendSecondsLeft,
    alreadyVerified,
  } = useEmailVerification({ onVerified });

  if (alreadyVerified) {
    return (
      <Screen>
        <Notice tone="success" message={t('verify.done')} />
        <Button label={t('actions.continue', { ns: 'common' })} onPress={onVerified} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="title">{t('verify.title')}</Text>
      <Text color="textSecondary">{t('verify.subtitle', { email: email ?? '' })}</Text>
      {resent ? <Notice tone="success" message={t('verify.resent')} /> : null}
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
            returnKeyType="done"
            onSubmitEditing={() => void submit()}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
            error={errorText(fieldState.error?.message)}
          />
        )}
      />
      <Button label={t('verify.submit')} onPress={() => void submit()} loading={isSubmitting} fullWidth />
      <Button
        label={
          resendSecondsLeft > 0 ? t('verify.resendIn', { seconds: resendSecondsLeft }) : t('verify.resend')
        }
        variant="secondary"
        onPress={resend}
        loading={isResending}
        disabled={resendSecondsLeft > 0}
      />
      <Button label={t('verify.later')} variant="ghost" onPress={onLater} />
    </Screen>
  );
}
