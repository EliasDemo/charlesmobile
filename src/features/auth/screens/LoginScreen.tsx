import { Controller } from 'react-hook-form';
import { useTranslation } from '@/shared/i18n';
import { formatDuration } from '@/shared/lib';
import { Button, Notice, PasswordField, Screen, Text, TextField, useFieldErrorText } from '@/shared/ui';
import { useLogin, type UseLoginOptions } from '../hooks/useLogin';

export interface LoginScreenProps extends UseLoginOptions {
  /** Message from the previous step (account created, password changed). */
  notice?: 'registered' | 'passwordChanged';
  onForgotPassword: () => void;
  onRegister: () => void;
}

export function LoginScreen({ notice, onForgotPassword, onRegister, onSuccess }: LoginScreenProps) {
  const { t } = useTranslation('auth');
  const errorText = useFieldErrorText('auth');
  const { form, submit, isSubmitting, generalError, lockedSeconds, lockedWithoutTime } = useLogin({
    onSuccess,
  });
  const locked = lockedSeconds > 0;
  return (
    <Screen>
      <Text variant="title">{t('login.title')}</Text>
      <Text color="textSecondary">{t('login.subtitle')}</Text>
      {notice ? <Notice tone="success" message={t(`login.${notice}`)} /> : null}
      {locked ? (
        <Notice tone="warning" message={t('login.locked', { time: formatDuration(lockedSeconds) })} />
      ) : null}
      {lockedWithoutTime ? <Notice tone="warning" message={t('login.lockedUnknown')} /> : null}
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
            returnKeyType="next"
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
        name="password"
        render={({ field, fieldState }) => (
          <PasswordField
            label={t('fields.password')}
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
            error={errorText(fieldState.error?.message)}
          />
        )}
      />
      <Button
        label={t('login.submit')}
        onPress={() => void submit()}
        loading={isSubmitting}
        disabled={locked}
        fullWidth
      />
      <Button label={t('login.forgot')} variant="ghost" onPress={onForgotPassword} />
      <Button label={t('login.noAccount')} variant="ghost" onPress={onRegister} />
    </Screen>
  );
}
