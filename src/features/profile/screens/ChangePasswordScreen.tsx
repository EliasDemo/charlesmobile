import { Controller } from 'react-hook-form';
import { useTranslation } from '@/shared/i18n';
import { Button, Notice, PasswordChecklist, PasswordField, Screen, useFieldErrorText } from '@/shared/ui';
import { useChangePassword } from '../hooks/useChangePassword';

export function ChangePasswordScreen({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation('profile');
  const errorText = useFieldErrorText('auth');
  const { form, submit, isSubmitting, generalError } = useChangePassword({ onDone });
  return (
    <Screen>
      {generalError ? <Notice tone="danger" message={generalError} /> : null}
      <Controller
        control={form.control}
        name="currentPassword"
        render={({ field, fieldState }) => (
          <PasswordField
            purpose="current"
            label={t('password.current')}
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
            label={t('password.new')}
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
            label={t('fields.confirmPassword', { ns: 'auth' })}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
            error={errorText(fieldState.error?.message)}
          />
        )}
      />
      <Button label={t('password.submit')} onPress={() => void submit()} loading={isSubmitting} fullWidth />
    </Screen>
  );
}
