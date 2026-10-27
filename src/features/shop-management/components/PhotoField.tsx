import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing } from '@/shared/theme';
import { ConfirmButton, BrandImage, Button, Card, Monogram, Notice, Text } from '@/shared/ui';
import { usePhoto, type PhotoKind } from '../hooks/usePhotos';

/**
 * A photo slot (cover, logo or barber photo) with its preview and the actions to choose, take or
 * remove it. Without the photo modules in the installed build, it explains they arrive next.
 */
export function PhotoField({
  shopId,
  kind,
  barberId,
  name,
  url,
}: {
  shopId: string;
  kind: PhotoKind;
  barberId?: string;
  /** For the initials when there is no photo. */
  name: string;
  url: string | null;
}) {
  const { t } = useTranslation('shop');
  const p = usePhoto({ shopId, kind, barberId });
  return (
    <Card>
      <Text variant="subtitle">{t(`photos.${kind}`)}</Text>
      {kind === 'cover' ? (
        <>
          <Text variant="caption" color="textSecondary">
            {t('photos.coverHint')}
          </Text>
          <BrandImage remoteUrl={url} imageKeys={[]} fallbackIcon="storefront" height={sizes.cover} />
        </>
      ) : (
        <View style={styles.center}>
          <Monogram name={name} size={sizes.avatar * 2} imageUrl={url} />
        </View>
      )}
      {p.available ? (
        <View style={styles.actions}>
          <Button label={t('photos.choose')} icon="images" onPress={p.choose} loading={p.busy} />
          <Button
            label={t('photos.take')}
            variant="secondary"
            icon="camera"
            onPress={p.take}
            disabled={p.busy}
          />
          {url ? (
            <ConfirmButton
              label={t('photos.remove')}
              variant="ghost"
              icon="trash"
              onConfirm={p.remove}
              disabled={p.busy}
              confirm={{
                title: t('confirm.removePhotoTitle', { ns: 'common' }),
                message: t('confirm.removePhotoMessage', { ns: 'common' }),
                confirmLabel: t('confirm.removePhoto', { ns: 'common' }),
                destructive: true,
              }}
            />
          ) : null}
        </View>
      ) : (
        <Notice tone="info" message={t('photos.unavailable')} />
      )}
      {p.message ? <Notice tone="warning" message={p.message} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
