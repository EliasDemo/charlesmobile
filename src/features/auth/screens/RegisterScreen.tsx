import { Controller } from 'react-hook-form';
import { Linking } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import {
  Button,
  Checkbox,
  ErrorState,
  LoadingState,
  Notice,
  PasswordField,
  Screen,
  Text,
  TextField,
  translateErrorMessage,
  useFieldErrorText,
} from '@/shared/ui';
import { PasswordRequirements } from '../components/PasswordRequirements';
import { useRegister, type UseRegisterOptions } from '../hooks/useRegister';

export interface RegisterScreenProps extends UseRegisterOptions {
  onLogin: () => void;
}

export function RegisterScreen({ onSuccess, onLogin }: RegisterScreenProps) {
  const { t } = useTranslation('auth');
  const errorText = useFieldErrorText('auth');
  const { form, submit, isSubmitting, generalError, terms, termsUrl, privacyUrl } = useRegister({
    onSuccess,
  });

  if (!terms.data) {
    return (
      <Screen>
        {terms.error ? (
          <ErrorState
            message={translateErrorMessage(terms.error)}
            onRetry={() => void terms.refetch()}
            retrying={terms.isRefetching}
          />
        ) : (
          <LoadingState />
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="title">{t('register.title')}</Text>
      <Text color="textSecondary">{t('register.subtitle')}</Text>
      {generalError ? <Notice tone="danger" message={generalError} /> : null}
      <Controller
        control={form.control}
        name="fullName"
        render={({ field, fieldState }) => (
          <TextField
            label={t('fields.fullName')}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
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
            purpose="new"
            label={t('fields.password')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
            error={errorText(fieldState.error?.message)}
            footer={<PasswordRequirements password={field.value} />}
          />
        )}
      />
      <Controller
        control={form.control}
        name="phone"
        render={({ field, fieldState }) => (
          <TextField
            label={t('fields.phone')}
            placeholder={t('fields.phonePlaceholder')}
            hint={t('fields.phoneHint')}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
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
        name="declaresAdult"
        render={({ field, fieldState }) => (
          <Checkbox
            label={t('register.adult')}
            checked={field.value}
            onChange={field.onChange}
            error={errorText(fieldState.error?.message)}
          />
        )}
      />
      <Controller
        control={form.control}
        name="acceptTerms"
        render={({ field, fieldState }) => (
          <Checkbox
            label={t('register.terms')}
            checked={field.value}
            onChange={field.onChange}
            error={errorText(fieldState.error?.message)}
          />
        )}
      />
      {termsUrl ? (
        <Button
          label={t('register.termsLink')}
          variant="ghost"
          onPress={() => void Linking.openURL(termsUrl)}
        />
      ) : null}
      {privacyUrl ? (
        <Button
          label={t('register.privacyLink')}
          variant="ghost"
          onPress={() => void Linking.openURL(privacyUrl)}
        />
      ) : null}
      <Button label={t('register.submit')} onPress={() => void submit()} loading={isSubmitting} fullWidth />
      <Button label={t('register.haveAccount')} variant="ghost" onPress={onLogin} />
    </Screen>
  );
}
