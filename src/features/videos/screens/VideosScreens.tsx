import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { spacing } from '@/shared/theme';
import {
  Button,
  Card,
  ConfirmDialog,
  Notice,
  QueryView,
  Screen,
  StatusPill,
  Text,
  TextField,
} from '@/shared/ui';
import type { Video, VideoOwner } from '../api/videosApi';
import { VideoCarousel } from '../components/VideoParts';
import { VIDEO_LIMIT, useManagedVideos, useProfileVideos, useShopVideos } from '../hooks/useVideos';

/** Videos on a barbershop's profile: shown only when there are ready ones. */
export function ShopVideosSection({ barbershopId }: { barbershopId: string }) {
  const { t } = useTranslation('videos');
  const query = useShopVideos(barbershopId);
  const ready = (query.data ?? []).filter((v) => v.status === 'READY');
  if (ready.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text variant="subtitle">{t('title')}</Text>
      <VideoCarousel videos={ready} />
    </View>
  );
}

/** The "Videos" tab of a barber's public profile. */
export function ProfileVideos({ profileId }: { profileId: string }) {
  const { t } = useTranslation('videos');
  const query = useProfileVideos(profileId);
  return (
    <QueryView
      query={query}
      isEmpty={(items) => items.filter((v) => v.status === 'READY').length === 0}
      empty={{ title: t('empty'), icon: 'videocam-outline' }}
    >
      {(items) => <VideoCarousel videos={items} />}
    </QueryView>
  );
}

const FAILURE_KEYS = {
  TOO_LONG: 'failure.TOO_LONG',
  NOT_A_VIDEO: 'failure.NOT_A_VIDEO',
  TOO_LARGE: 'failure.TOO_LARGE',
  PROCESSING_FAILED: 'failure.PROCESSING_FAILED',
} as const;

/** Upload, follow the processing and delete: for the barbershop or the barber's profile. */
function ManageVideos({ owner }: { owner: VideoOwner }) {
  const { t } = useTranslation('videos');
  const v = useManagedVideos(owner);
  const [caption, setCaption] = useState('');
  const [removing, setRemoving] = useState<Video | null>(null);
  const busy = v.stage !== 'idle';
  const limit = VIDEO_LIMIT[owner.kind];
  return (
    <View style={styles.section}>
      <Text variant="caption" color="textSecondary">
        {t('rules', { limit })}
      </Text>
      {!v.canUpload ? <Notice tone="info" message={t('unavailable')} /> : null}
      {v.message ? <Notice tone="warning" message={v.message} /> : null}
      {v.canUpload ? (
        <Card>
          <TextField label={t('caption')} value={caption} onChangeText={setCaption} maxLength={200} />
          {busy ? (
            <Text color="textSecondary" testID="video-progress">
              {t(v.stage === 'compressing' ? 'compressing' : 'uploading', {
                percent: Math.round(v.progress * 100),
              })}
            </Text>
          ) : null}
          <View style={styles.row}>
            <Button
              label={t('choose')}
              icon="film"
              onPress={() => {
                v.upload('library', caption);
                setCaption('');
              }}
              loading={busy}
            />
            <Button
              label={t('record')}
              variant="secondary"
              icon="videocam"
              onPress={() => {
                v.upload('camera', caption);
                setCaption('');
              }}
              disabled={busy}
            />
          </View>
        </Card>
      ) : null}
      <QueryView
        query={v.query}
        isEmpty={(items) => items.length === 0}
        empty={{ title: t('emptyMine'), icon: 'videocam-outline' }}
      >
        {(items) => (
          <View style={styles.section}>
            <VideoCarousel videos={items} reportable={false} />
            {items.map((video) => (
              <Card key={video.id}>
                <Text>{video.caption ?? t('untitled')}</Text>
                {video.status === 'PROCESSING' ? (
                  <StatusPill tone="pending" icon="hourglass" label={t('status.PROCESSING')} />
                ) : video.status === 'FAILED' ? (
                  <>
                    <StatusPill tone="danger" icon="alert-circle" label={t('status.FAILED')} />
                    {video.failureReason ? (
                      <Text color="textSecondary">{t(FAILURE_KEYS[video.failureReason])}</Text>
                    ) : null}
                  </>
                ) : (
                  <StatusPill tone="success" icon="checkmark-circle" label={t('status.READY')} />
                )}
                <Button label={t('delete')} variant="ghost" onPress={() => setRemoving(video)} />
              </Card>
            ))}
          </View>
        )}
      </QueryView>
      <ConfirmDialog
        visible={removing !== null}
        title={t('deleteTitle')}
        message={t('deleteMessage')}
        confirmLabel={t('delete')}
        destructive
        onConfirm={() => {
          if (removing) v.remove(removing.id);
          setRemoving(null);
        }}
        onCancel={() => setRemoving(null)}
      />
    </View>
  );
}

/** "Mis videos" inside "Mi perfil profesional". */
export function MyVideos() {
  const { t } = useTranslation('videos');
  return (
    <View style={styles.section}>
      <Text variant="subtitle">{t('mine')}</Text>
      <ManageVideos owner={{ kind: 'me' }} />
    </View>
  );
}

/** "Videos del local" in barbershop mode. */
export function ShopVideosScreen({ shopId }: { shopId: string }) {
  return (
    <Screen>
      <ManageVideos owner={{ kind: 'shop', shopId }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
