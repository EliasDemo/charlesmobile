import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { env } from '@/shared/config';
import { formatLongDate } from '@/shared/lib';
import { spacing } from '@/shared/theme';
import {
  Button,
  Chip,
  Notice,
  PhoneField,
  QueryView,
  Screen,
  Text,
  TextField,
  useFieldErrorText,
} from '@/shared/ui';
import { ProfilePhoto } from '../components/ProfilePhoto';
import { useEditProfile } from '../hooks/useEditProfile';

const GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as const;

export function EditProfileScreen({ onSaved }: { onSaved: () => void }) {
  const { t } = useTranslation('profile');
  const errorText = useFieldErrorText('auth');
  const { query, form, submit, isSubmitting, generalError, usernameChangeableAt } = useEditProfile({
    onSaved,
  });
  return (
    <Screen>
      <QueryView query={query}>
        {(profile) => (
          <>
            <ProfilePhoto name={profile.fullName} photoUrl={profile.photoUrl} />
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
            <Controller
              control={form.control}
              name="username"
              render={({ field, fieldState }) => (
                <TextField
                  label={t('fields.username', { ns: 'auth' })}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                  editable={!usernameChangeableAt}
                  prefix={
                    <Text color="textSecondary" style={styles.at}>
                      @
                    </Text>
                  }
                  hint={
                    usernameChangeableAt
                      ? t('usernameLocked', {
                          date: formatLongDate(usernameChangeableAt, env.defaultTimeZone),
                        })
                      : t('usernameHint')
                  }
                  value={field.value}
                  onChangeText={(text) => field.onChange(text.toLowerCase().replace(/\s/g, ''))}
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
                <PhoneField
                  label={t('fields.phone', { ns: 'auth' })}
                  placeholder={t('fields.phonePlaceholder', { ns: 'auth' })}
                  hint={t('edit.phoneHint')}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  error={errorText(fieldState.error?.message)}
                />
              )}
            />
            <Notice tone="info" message={t('privacy')} />
            <Controller
              control={form.control}
              name="birthDate"
              render={({ field, fieldState }) => (
                <TextField
                  label={t('birthDate')}
                  placeholder={t('birthDatePlaceholder')}
                  keyboardType="numbers-and-punctuation"
                  autoComplete="birthdate-full"
                  maxLength={10}
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
              name="gender"
              render={({ field }) => (
                <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={t('gender')}>
                  <Text variant="label" color="textSecondary">
                    {t('gender')}
                  </Text>
                  <View style={styles.chips}>
                    {GENDERS.map((gender) => (
                      <Chip
                        key={gender}
                        label={t(`genders.${gender}`)}
                        selected={field.value === gender}
                        // Tapping the chosen one again clears it.
                        onPress={() => field.onChange(field.value === gender ? '' : gender)}
                      />
                    ))}
                  </View>
                </View>
              )}
            />
            <Button label={t('edit.submit')} onPress={() => void submit()} loading={isSubmitting} fullWidth />
          </>
        )}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  at: { paddingLeft: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
