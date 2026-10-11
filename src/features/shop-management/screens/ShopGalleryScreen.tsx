import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStyles } from '@/features/gallery';
import { mediaUrl, translateError } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { spacing, useTheme } from '@/shared/theme';
import {
  Button,
  Checkbox,
  Chip,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Icon,
  Notice,
  Screen,
  SkeletonList,
  StatusPill,
  Text,
  TextField,
} from '@/shared/ui';
import type { ManagedGalleryImage } from '../api/shopApi';
import { useBarbersList } from '../hooks/useBarbers';
import { CAPTION_MAX, GALLERY_STYLES_MAX, useGalleryUpload, useManagedGallery } from '../hooks/usePhotos';
import { useServicesList } from '../hooks/useServices';

const COLUMNS = 3;

/**
 * Gallery of works of the barbershop (or of one barber, `ownBarberId`): upload with consent,
 * highlight up to 6, edit caption/styles/service, delete; hidden or removed ones are flagged.
 */
export function ShopGalleryScreen({ shopId, ownBarberId }: { shopId: string; ownBarberId?: string }) {
  const { t } = useTranslation('shop');
  const g = useManagedGallery(shopId, ownBarberId ?? null);
  const [uploading, setUploading] = useState(false);
  const [width, setWidth] = useState(0);
  const tile = width > 0 ? Math.floor((width - spacing.sm * (COLUMNS - 1)) / COLUMNS) : 0;
  return (
    <Screen onRefresh={g.refresh} refreshing={g.query.isRefetching}>
      <Text color="textSecondary">{t('gallery.hint')}</Text>
      <Button label={t('gallery.upload')} icon="cloud-upload" onPress={() => setUploading(true)} fullWidth />
      <Text variant="caption" color="textMuted">
        {t('gallery.limit')}
      </Text>
      {g.error ? <Notice tone="danger" message={g.error} /> : null}
      {g.query.isPending ? (
        <SkeletonList count={2} />
      ) : g.query.error ? (
        <ErrorState message={translateError(g.query.error).message} onRetry={g.refresh} />
      ) : g.photos.length === 0 ? (
        <EmptyState icon="images-outline" title={t('gallery.empty')} />
      ) : (
        <View
          style={styles.grid}
          onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
          testID="manage-grid"
        >
          {tile > 0
            ? g.photos.map((photo) => (
                <ManagedThumb key={photo.id} photo={photo} size={tile} onPress={() => g.edit(photo)} />
              ))
            : null}
        </View>
      )}
      {g.query.hasNextPage ? (
        <Button
          label={t('more', { ns: 'gallery' })}
          variant="secondary"
          onPress={() => void g.query.fetchNextPage()}
          loading={g.query.isFetchingNextPage}
        />
      ) : null}

      {uploading ? (
        <UploadSheet shopId={shopId} ownBarberId={ownBarberId} onClose={() => setUploading(false)} />
      ) : null}
      {g.editing ? <EditSheet key={g.editing.id} shopId={shopId} photo={g.editing} gallery={g} /> : null}
      <ConfirmDialog
        visible={g.deleting !== null}
        title={t('gallery.deleteTitle')}
        message={t('gallery.deleteMessage')}
        confirmLabel={t('gallery.deleteConfirm')}
        onConfirm={g.confirmDelete}
        onCancel={g.cancelDelete}
        loading={g.isDeleting}
        destructive
      />
    </Screen>
  );
}

function ManagedThumb({
  photo,
  size,
  onPress,
}: {
  photo: ManagedGalleryImage;
  size: number;
  onPress: () => void;
}) {
  const { t } = useTranslation('shop');
  const theme = useTheme();
  const uri = mediaUrl(photo.thumbUrl);
  const flagged = photo.removed || photo.hidden;
  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={[
        photo.caption ?? t('photo', { ns: 'gallery' }),
        photo.pinned ? t('gallery.pinned') : null,
        photo.removed ? t('gallery.removed') : photo.hidden ? t('gallery.hidden') : null,
      ]
        .filter(Boolean)
        .join('. ')}
      onPress={onPress}
      style={{
        width: size,
        height: size,
        borderRadius: theme.radius.md,
        overflow: 'hidden',
        backgroundColor: theme.colors.surfaceMuted,
      }}
      testID={`managed-${photo.id}`}
    >
      {uri ? <Image source={{ uri }} style={[StyleSheet.absoluteFill, flagged ? styles.dim : null]} /> : null}
      <View style={styles.badges}>
        {photo.pinned ? <Badge icon="star" bg={theme.colors.primary} fg={theme.colors.onPrimary} /> : null}
        {flagged ? (
          <Badge icon="eye-off" bg={theme.colors.statusDangerBg} fg={theme.colors.statusDangerFg} />
        ) : null}
      </View>
    </Pressable>
  );
}

function Badge({ icon, bg, fg }: { icon: 'star' | 'eye-off'; bg: string; fg: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: bg, borderRadius: theme.radius.pill }]}>
      <Icon name={icon} size={theme.typography.caption.fontSize} color={fg} />
    </View>
  );
}

/** Full-screen sheet over the screen (keeps the gallery behind). */
function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.sheet, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <View style={styles.sheetHeader}>
          <Text variant="title" style={styles.flex}>
            {title}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('actions.cancel')}
            onPress={onClose}
            style={styles.close}
          >
            <Icon name="close" size={theme.typography.title.fontSize} color={theme.colors.textPrimary} />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + spacing.xl }]}
        >
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

function StylePicker({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  const { t } = useTranslation('shop');
  const styles_ = useStyles();
  if (!styles_.data?.length) return null;
  return (
    <View style={styles.section}>
      <Text variant="label" color="textSecondary">
        {t('gallery.styles')}
      </Text>
      <View style={styles.chips}>
        {styles_.data.map((style) => (
          <Chip
            key={style.id}
            label={style.name}
            selected={selected.includes(style.id)}
            onPress={() => onToggle(style.id)}
          />
        ))}
      </View>
    </View>
  );
}

function ServicePicker({
  shopId,
  value,
  onChange,
}: {
  shopId: string;
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const { t } = useTranslation('shop');
  const services = useServicesList(shopId);
  if (!services.data?.length) return null;
  return (
    <View style={styles.section}>
      <Text variant="label" color="textSecondary">
        {t('gallery.service')}
      </Text>
      <View style={styles.chips}>
        <Chip label={t('gallery.noService')} selected={value === null} onPress={() => onChange(null)} />
        {services.data.map((service) => (
          <Chip
            key={service.id}
            label={service.name}
            selected={value === service.id}
            onPress={() => onChange(service.id)}
          />
        ))}
      </View>
    </View>
  );
}

function UploadSheet({
  shopId,
  ownBarberId,
  onClose,
}: {
  shopId: string;
  ownBarberId?: string;
  onClose: () => void;
}) {
  const { t } = useTranslation('shop');
  const theme = useTheme();
  const u = useGalleryUpload({ shopId, barberId: ownBarberId, onDone: onClose });
  const barbers = useBarbersList(shopId, !ownBarberId);
  const barberId = u.barberId;
  const preview = u.photo?.uri;
  return (
    <Sheet title={t('gallery.uploadTitle')} onClose={onClose}>
      {!u.available ? <Notice tone="info" message={t('photos.unavailable')} /> : null}
      {preview ? (
        <Image
          source={{ uri: preview }}
          style={[styles.preview, { borderRadius: theme.radius.lg }]}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}
      {u.available ? (
        <View style={styles.actionsRow}>
          <Button label={t('photos.choose')} icon="images" onPress={u.choose} />
          <Button label={t('photos.take')} variant="secondary" icon="camera" onPress={u.take} />
        </View>
      ) : null}
      {u.message ? <Notice tone="warning" message={u.message} /> : null}
      {ownBarberId ? null : (
        <View style={styles.section}>
          <Text variant="label" color="textSecondary">
            {t('gallery.who')}
          </Text>
          <View style={styles.chips}>
            {(barbers.data ?? []).map((barber) => (
              <Chip
                key={barber.id}
                label={barber.displayName}
                selected={barberId === barber.id}
                onPress={() => u.setBarberId(barber.id)}
              />
            ))}
          </View>
        </View>
      )}
      <TextField
        label={t('gallery.caption')}
        value={u.caption}
        onChangeText={u.setCaption}
        maxLength={CAPTION_MAX}
      />
      <StylePicker selected={u.styleIds} onToggle={u.toggleStyle} />
      <ServicePicker shopId={shopId} value={u.serviceId} onChange={u.setServiceId} />
      <Checkbox label={t('gallery.consent')} checked={u.consent} onChange={u.setConsent} />
      <Button
        label={t('gallery.send')}
        icon="cloud-upload"
        onPress={u.send}
        loading={u.isSending}
        disabled={!u.canSend}
        fullWidth
      />
    </Sheet>
  );
}

function EditSheet({
  shopId,
  photo,
  gallery,
}: {
  shopId: string;
  photo: ManagedGalleryImage;
  gallery: ReturnType<typeof useManagedGallery>;
}) {
  const { t } = useTranslation('shop');
  const theme = useTheme();
  const [caption, setCaption] = useState(photo.caption ?? '');
  const [styleIds, setStyleIds] = useState(photo.styles.map((s) => s.id));
  const [serviceId, setServiceId] = useState<string | null>(photo.service?.id ?? null);
  const uri = mediaUrl(photo.largeUrl);
  return (
    <Sheet title={t('gallery.edit')} onClose={gallery.closeEdit}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.preview, { borderRadius: theme.radius.lg }]}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <View style={styles.chips}>
        {photo.pinned ? <StatusPill tone="success" icon="star" label={t('gallery.pinned')} /> : null}
        {photo.removed ? (
          <StatusPill tone="danger" icon="ban" label={t('gallery.removed')} />
        ) : photo.hidden ? (
          <StatusPill tone="danger" icon="eye-off" label={t('gallery.hidden')} />
        ) : null}
        {photo.openReports > 0 ? (
          <StatusPill tone="pending" icon="flag" label={t('gallery.reports', { count: photo.openReports })} />
        ) : null}
      </View>
      <Button
        label={photo.pinned ? t('gallery.unpin') : t('gallery.pin')}
        variant="secondary"
        icon="star"
        onPress={() => gallery.togglePin(photo)}
        disabled={gallery.isSaving}
      />
      <TextField
        label={t('gallery.caption')}
        value={caption}
        onChangeText={setCaption}
        maxLength={CAPTION_MAX}
      />
      <StylePicker
        selected={styleIds}
        onToggle={(id) =>
          setStyleIds((ids) =>
            ids.includes(id)
              ? ids.filter((x) => x !== id)
              : ids.length < GALLERY_STYLES_MAX
                ? [...ids, id]
                : ids,
          )
        }
      />
      <ServicePicker shopId={shopId} value={serviceId} onChange={setServiceId} />
      {gallery.error ? <Notice tone="danger" message={gallery.error} /> : null}
      <Button
        label={t('gallery.save')}
        onPress={() => gallery.save(photo, { caption: caption.trim() || null, styleIds, serviceId })}
        loading={gallery.isSaving}
        fullWidth
      />
      <Button
        label={t('gallery.delete')}
        variant="ghost"
        icon="trash"
        onPress={() => gallery.askDelete(photo)}
      />
    </Sheet>
  );
}

const PREVIEW_RATIO = 1;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dim: { opacity: 0.4 },
  badges: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  badge: { padding: spacing.xxs },
  sheet: { flex: 1 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.sm,
  },
  close: { padding: spacing.sm },
  sheetContent: { paddingHorizontal: spacing.gutter, gap: spacing.lg },
  section: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  preview: { width: '100%', aspectRatio: PREVIEW_RATIO },
});
