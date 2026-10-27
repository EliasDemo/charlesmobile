import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing } from '@/shared/theme';
import { ConfirmButton, Button, Monogram, Notice, Text } from '@/shared/ui';
import { useProfilePhoto } from '../hooks/useProfilePhoto';

/** The account photo with its actions; initials when there is none. */
export function ProfilePhoto({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  const { t } = useTranslation('profile');
  const photo = useProfilePhoto();
  return (
    <View style={styles.root} testID="profile-photo">
      <Monogram name={name} size={sizes.avatarLarge} imageUrl={photoUrl} />
      <Text color="textSecondary" align="center">
        {t('photo.hint')}
      </Text>
      {!photo.available ? <Notice tone="info" message={t('photo.unavailable')} /> : null}
      {photo.message ? <Notice tone="warning" message={photo.message} /> : null}
      {photo.available ? (
        <View style={styles.actions}>
          <Button label={t('photo.choose')} icon="images" onPress={photo.choose} loading={photo.busy} />
          <Button
            label={t('photo.take')}
            variant="secondary"
            icon="camera"
            onPress={photo.take}
            disabled={photo.busy}
          />
          {photoUrl ? (
            <ConfirmButton
              label={t('photo.remove')}
              variant="ghost"
              icon="trash"
              onConfirm={photo.remove}
              disabled={photo.busy}
              confirm={{
                title: t('confirm.removePhotoTitle', { ns: 'common' }),
                message: t('confirm.removePhotoMessage', { ns: 'common' }),
                confirmLabel: t('confirm.removePhoto', { ns: 'common' }),
                destructive: true,
              }}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
});
