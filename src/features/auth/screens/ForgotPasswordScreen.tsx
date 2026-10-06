import { Controller } from 'react-hook-form';
import { useTranslation } from '@/shared/i18n';
import { Button, Notice, Screen, Text, TextField, useFieldErrorText } from '@/shared/ui';
import { useForgotPassword } from '../hooks/usePasswordReset';

export interface ForgotPasswordScreenProps {
  onSent: (email: string) => void;
}

export function ForgotPasswordScreen({ onSent }: ForgotPasswordScreenProps) {
  const { t } = useTranslation('auth');
  const errorText = useFieldErrorText('auth');
  const { form, submit, isSubmitting, generalError } = useForgotPassword({ onSent });
  return (
    <Screen>
      <Text variant="title">{t('forgot.title')}</Text>
      <Text color="textSecondary">{t('forgot.subtitle')}</Text>
      {generalError ? <Notice tone="danger" message={generalError} /> : null}
      <Controller
        control={form.control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
            label={t('fields.email')}
            placeholder={t('fields.emailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={() => void submit()}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
            error={errorText(fieldState.error?.message)}
          />
        )}
      />
      <Button label={t('forgot.submit')} onPress={() => void submit()} loading={isSubmitting} fullWidth />
    </Screen>
  );
}
