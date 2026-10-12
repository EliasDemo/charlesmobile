import {
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mediaUrl } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { formatMoney } from '@/shared/lib';
import { spacing, touchTarget, useTheme } from '@/shared/theme';
import {
  Button,
  Chip,
  ConfirmDialog,
  FadeIn,
  Icon,
  Notice,
  StatusPill,
  Text,
  TextField,
  usePressScale,
  ZoomableImage,
} from '@/shared/ui';
import type { GalleryImage } from '../api/galleryApi';
import { REPORT_DETAILS_MAX, REPORT_REASONS, useReportImage } from '../hooks/useGallery';

/** Square thumbnail of the grid; tapping it opens the photo. */
export function Thumb({
  photo,
  size,
  index,
  onPress,
}: {
  photo: GalleryImage;
  size: number;
  index: number;
  onPress: () => void;
}) {
  const { t } = useTranslation('gallery');
  const theme = useTheme();
  const press = usePressScale();
  const uri = mediaUrl(photo.thumbUrl);
  return (
    <FadeIn index={index}>
      <Animated.View style={press.style}>
        <Pressable
          accessibilityRole="imagebutton"
          accessibilityLabel={photo.caption ?? t('photo')}
          onPress={onPress}
          {...press.handlers}
          style={{
            width: size,
            height: size,
            borderRadius: theme.radius.md,
            overflow: 'hidden',
            backgroundColor: theme.colors.surfaceMuted,
          }}
          testID={`photo-${photo.id}`}
        >
          {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
          {photo.pinned ? (
            <View
              style={[styles.pin, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.pill }]}
            >
              <Icon name="star" size={theme.typography.caption.fontSize} color={theme.colors.onPrimary} />
            </View>
          ) : null}
        </Pressable>
      </Animated.View>
    </FadeIn>
  );
}

/** Full-screen photo: caption, styles, barber, "Reservar este estilo" and report. */
export function PhotoViewer({
  photo,
  onClose,
  onBookStyle,
}: {
  photo: GalleryImage | null;
  onClose: () => void;
  onBookStyle: (serviceId: string, barberId: string | null) => void;
}) {
  const { t } = useTranslation('gallery');
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const report = useReportImage(photo?.id ?? null);
  if (!photo) return null;
  const uri = mediaUrl(photo.largeUrl);
  const height = photo.width > 0 ? Math.min((width * photo.height) / photo.width, width * MAX_RATIO) : width;
  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.viewer, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <View style={styles.top}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('close')}
            onPress={onClose}
            style={styles.close}
          >
            <Icon name="close" size={touchTarget / 2} color={theme.colors.textPrimary} />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={[styles.viewerContent, { paddingBottom: insets.bottom + spacing.xl }]}
        >
          {uri ? (
            <ZoomableImage
              uri={uri}
              style={{ width, height, backgroundColor: theme.colors.surfaceMuted }}
              accessibilityLabel={photo.caption ?? t('photo')}
            />
          ) : null}
          <View style={styles.info}>
            {photo.caption ? <Text variant="subtitle">{photo.caption}</Text> : null}
            {photo.barberName ? (
              <Text color="textSecondary">{t('by', { name: photo.barberName })}</Text>
            ) : null}
            {photo.styles.length > 0 ? (
              <View style={styles.tags}>
                {photo.styles.map((style) => (
                  <StatusPill key={style.id} tone="neutral" icon="sparkles" label={style.name} />
                ))}
              </View>
            ) : null}
            {photo.service ? (
              <Button
                label={t('bookStyle', {
                  service: photo.service.name,
                  price: formatMoney(photo.service.price),
                })}
                icon="calendar"
                onPress={() => onBookStyle(photo.service!.id, photo.barberId)}
                fullWidth
              />
            ) : null}
            {report.canReport ? (
              <Button label={t('report.action')} variant="ghost" icon="flag" onPress={report.ask} />
            ) : null}
          </View>
        </ScrollView>
        <ConfirmDialog
          visible={report.open}
          title={t('report.title')}
          message={t('report.message')}
          confirmLabel={t('report.send')}
          onConfirm={report.send}
          onCancel={report.close}
          loading={report.isSending}
          confirmDisabled={!report.canSend}
          icon="flag"
        >
          <View style={styles.tags}>
            {REPORT_REASONS.map((reason) => (
              <Chip
                key={reason}
                label={t(`report.reasons.${reason}`)}
                selected={report.reason === reason}
                onPress={() => report.setReason(reason)}
              />
            ))}
          </View>
          <TextField
            label={t('report.details')}
            value={report.details}
            onChangeText={report.setDetails}
            maxLength={REPORT_DETAILS_MAX}
            multiline
          />
          {report.error ? <Notice tone="danger" message={report.error} /> : null}
        </ConfirmDialog>
      </View>
    </Modal>
  );
}

const MAX_RATIO = 1.4;
const PIN_OFFSET = spacing.xs;

const styles = StyleSheet.create({
  pin: { position: 'absolute', top: PIN_OFFSET, right: PIN_OFFSET, padding: spacing.xxs },
  viewer: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.sm },
  close: { minWidth: touchTarget, minHeight: touchTarget, alignItems: 'center', justifyContent: 'center' },
  viewerContent: { gap: spacing.lg },
  info: { gap: spacing.md, paddingHorizontal: spacing.gutter },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
