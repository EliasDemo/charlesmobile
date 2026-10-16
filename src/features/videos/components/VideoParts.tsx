import { useState, type ComponentType } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mediaUrl } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { videoPlaybackAvailable } from '@/shared/lib';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Button, Chip, ConfirmDialog, Icon, Notice, Text } from '@/shared/ui';
import type { Video, VideoReportReason } from '../api/videosApi';
import { useReportVideo } from '../hooks/useVideos';

const REASONS: VideoReportReason[] = ['NOT_MY_PHOTO', 'NO_CONSENT', 'INAPPROPRIATE', 'MISLEADING', 'OTHER'];
const THUMB_WIDTH = sizes.cover * 0.7;

/** The player, loaded once and only when expo-video exists in the installed build. */
const NativePlayer: ComponentType<{ uri: string }> | null = videoPlaybackAvailable()
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional native module (rule 12)
    (require('./NativeVideoPlayer') as { default: ComponentType<{ uri: string }> }).default
  : null;

/** A row of posters; tapping one opens the player (never autoplay with sound). */
export function VideoCarousel({ videos, reportable = true }: { videos: Video[]; reportable?: boolean }) {
  const { t } = useTranslation('videos');
  const theme = useTheme();
  const [open, setOpen] = useState<Video | null>(null);
  const ready = videos.filter((v) => v.status === 'READY' && v.videoUrl);
  if (ready.length === 0) return null;
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {ready.map((video) => {
          const poster = mediaUrl(video.posterUrl);
          return (
            <Pressable
              key={video.id}
              accessibilityRole="button"
              accessibilityLabel={video.caption ?? t('play')}
              onPress={() => setOpen(video)}
              style={[styles.thumb, { borderRadius: theme.radius.md, backgroundColor: theme.colors.surface }]}
              testID={`video-${video.id}`}
            >
              {poster ? <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} /> : null}
              <View style={styles.play}>
                <Icon name="play-circle" size={touchTarget} color={theme.colors.onPrimary} />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      {open ? <PlayerModal video={open} reportable={reportable} onClose={() => setOpen(null)} /> : null}
    </>
  );
}

function PlayerModal({
  video,
  reportable,
  onClose,
}: {
  video: Video;
  reportable: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation('videos');
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const report = useReportVideo();
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<VideoReportReason>('INAPPROPRIATE');
  const uri = mediaUrl(video.videoUrl);
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modal, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <View style={styles.bar}>
          <Text variant="bodyStrong" style={styles.flex} numberOfLines={1}>
            {video.caption ?? t('title')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('close')}
            onPress={onClose}
            style={styles.close}
          >
            <Icon name="close" size={touchTarget / 2} color={theme.colors.textPrimary} />
          </Pressable>
        </View>
        {NativePlayer && uri ? <NativePlayer uri={uri} /> : <Notice tone="info" message={t('unavailable')} />}
        {reportable ? (
          <Button label={t('report.action')} variant="ghost" icon="flag" onPress={() => setReporting(true)} />
        ) : null}
      </View>
      <ConfirmDialog
        visible={reporting}
        title={t('report.title')}
        message={t('report.message')}
        confirmLabel={t('report.send')}
        icon="flag"
        loading={report.isPending}
        onConfirm={() => {
          report.mutate({ id: video.id, reason });
          setReporting(false);
        }}
        onCancel={() => setReporting(false)}
      >
        <View style={styles.reasons}>
          {REASONS.map((r) => (
            <Chip
              key={r}
              label={t(`report.reasons.${r}`)}
              selected={reason === r}
              onPress={() => setReason(r)}
            />
          ))}
        </View>
      </ConfirmDialog>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm },
  thumb: {
    width: THUMB_WIDTH,
    aspectRatio: 9 / 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: { alignItems: 'center', justifyContent: 'center' },
  modal: { flex: 1, gap: spacing.md, padding: spacing.gutter },
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  close: { minWidth: touchTarget, minHeight: touchTarget, alignItems: 'center', justifyContent: 'center' },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
