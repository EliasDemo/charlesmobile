import { Controller } from 'react-hook-form';
import { useTranslation } from '@/shared/i18n';
import { sizes } from '@/shared/theme';
import { formatDuration } from '@/shared/lib';
import {
  BrandImage,
  Button,
  Notice,
  PasswordField,
  Screen,
  useKeyboardVisible,
  Text,
  TextField,
  useFieldErrorText,
} from '@/shared/ui';
import { useLogin, type UseLoginOptions } from '../hooks/useLogin';

export interface LoginScreenProps extends UseLoginOptions {
  /** Message from the previous step (account created, password changed). */
  notice?: 'registered' | 'passwordChanged' | 'deletionCancelled';
  onForgotPassword: () => void;
  onRegister: () => void;
}

export function LoginScreen({
  notice,
  onForgotPassword,
  onRegister,
  onSuccess,
  onPendingDeletion,
  onDisabled,
}: LoginScreenProps) {
  const { t } = useTranslation('auth');
  const errorText = useFieldErrorText('auth');
  const { form, submit, isSubmitting, generalError, lockedSeconds, lockedWithoutTime } = useLogin({
    onSuccess,
    onPendingDeletion,
    onDisabled,
  });
  const locked = lockedSeconds > 0;
  // The header gives its room to the fields while typing.
  const keyboardOpen = useKeyboardVisible();
  return (
    <Screen>
      {keyboardOpen ? null : (
        <BrandImage imageKeys={['auth-background']} fallbackIcon="cut" height={sizes.cover} />
      )}
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
        name="login"
        render={({ field, fieldState }) => (
          <TextField
            label={t('fields.login')}
            placeholder={t('fields.loginPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => form.setFocus('password')}
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
