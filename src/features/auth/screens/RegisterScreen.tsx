import { Controller } from 'react-hook-form';
import { Linking, StyleSheet } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing } from '@/shared/theme';
import {
  BrandImage,
  Button,
  Checkbox,
  ErrorState,
  LoadingState,
  Notice,
  PasswordChecklist,
  PasswordField,
  PhoneField,
  Screen,
  Text,
  TextField,
  translateErrorMessage,
  useFieldErrorText,
} from '@/shared/ui';
import { useRegister, type UseRegisterOptions } from '../hooks/useRegister';

export interface RegisterScreenProps extends UseRegisterOptions {
  onLogin: () => void;
}

export function RegisterScreen({ onSuccess, onLogin }: RegisterScreenProps) {
  const { t } = useTranslation('auth');
  const errorText = useFieldErrorText('auth');
  const reg = useRegister({ onSuccess });
  const { form, submit, isSubmitting, generalError, terms, termsUrl, privacyUrl } = reg;

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
      <BrandImage imageKeys={['auth-background']} fallbackIcon="cut" height={sizes.cover} />
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
            hint={t('fields.fullNameHint')}
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
        name="username"
        render={({ field, fieldState }) => (
          <TextField
            label={t('fields.username')}
            placeholder={t('fields.usernamePlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username-new"
            textContentType="username"
            maxLength={20}
            value={field.value}
            onChangeText={(text) => field.onChange(text.toLowerCase().replace(/\s/g, ''))}
            onBlur={field.onBlur}
            ref={field.ref}
            prefix={
              <Text color="textSecondary" style={styles.at}>
                @
              </Text>
            }
            error={
              errorText(fieldState.error?.message) ??
              (reg.usernameStatus === 'TAKEN' ||
              reg.usernameStatus === 'RESERVED' ||
              reg.usernameStatus === 'INVALID'
                ? t(`username.${reg.usernameStatus}`)
                : undefined)
            }
            hint={
              reg.usernameStatus === 'available'
                ? t('username.available')
                : reg.usernameStatus === 'checking'
                  ? t('username.checking')
                  : t('fields.usernameHint')
            }
            testID="username-input"
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
            footer={<PasswordChecklist password={field.value} />}
          />
        )}
      />
      <Controller
        control={form.control}
        name="confirmPassword"
        render={({ field, fieldState }) => (
          <PasswordField
            purpose="new"
            label={t('fields.confirmPassword')}
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
        name="phone"
        render={({ field, fieldState }) => (
          <PhoneField
            label={t('fields.phone')}
            placeholder={t('fields.phonePlaceholder')}
            hint={t('fields.phoneHint')}
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

const styles = StyleSheet.create({ at: { paddingLeft: spacing.md } });
