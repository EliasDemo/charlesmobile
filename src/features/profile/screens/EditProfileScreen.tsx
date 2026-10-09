import { Controller } from 'react-hook-form';
import { useTranslation } from '@/shared/i18n';
import { Button, Notice, QueryView, Screen, TextField, useFieldErrorText } from '@/shared/ui';
import { useEditProfile } from '../hooks/useEditProfile';

export function EditProfileScreen({ onSaved }: { onSaved: () => void }) {
  const { t } = useTranslation('profile');
  const errorText = useFieldErrorText('auth');
  const { query, form, submit, isSubmitting, generalError } = useEditProfile({ onSaved });
  return (
    <Screen>
      <QueryView query={query}>
        {(profile) => (
          <>
            {generalError ? <Notice tone="danger" message={generalError} /> : null}
            <Controller
              control={form.control}
              name="fullName"
              render={({ field, fieldState }) => (
                <TextField
                  label={t('fields.fullName', { ns: 'auth' })}
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
            <TextField
              label={t('email')}
              value={profile.email}
              editable={false}
              hint={t('edit.emailLocked')}
            />
            <Controller
              control={form.control}
              name="phone"
              render={({ field, fieldState }) => (
                <TextField
                  label={t('fields.phone', { ns: 'auth' })}
                  placeholder={t('fields.phonePlaceholder', { ns: 'auth' })}
                  hint={t('edit.phoneHint')}
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
            <Button label={t('edit.submit')} onPress={() => void submit()} loading={isSubmitting} fullWidth />
          </>
        )}
      </QueryView>
    </Screen>
  );
}
