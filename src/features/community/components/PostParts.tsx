import { useState, type ReactNode } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mediaUrl } from '@/shared/api';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { formatMoney, formatShortDate, formatTime } from '@/shared/lib';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import {
  Badge,
  Button,
  Chip,
  ConfirmDialog,
  Icon,
  Monogram,
  Text,
  TextField,
  useSurfaceStyle,
  type IconName,
} from '@/shared/ui';
import type { Post, ReportReason, ReportTarget } from '../api/communityApi';
import { REPORT_REASONS, useModeration, usePostActions } from '../hooks/useCommunity';

const zone = env.defaultTimeZone;
const ACTION_ICON = sizes.icon + spacing.xs;
const CAPTION_ICON = sizes.icon - spacing.xs;

export const TYPE_ICON: Record<Post['type'], IconName> = {
  PROMOTION: 'pricetag',
  EVENT: 'calendar',
  WORK: 'cut',
  ANNOUNCEMENT: 'megaphone',
};

export interface PostCardActions {
  onOpen?: (postId: string) => void;
  onOpenAuthor: (author: Post['author']) => void;
  /** "Reservar con esta promo" / "Reservar este estilo" (a barbershop author). */
  onBook?: (post: Post) => void;
  onRequireLogin: () => void;
  onDeleted?: () => void;
}

/** A post of the feed: author, photos, text, its type's box (promo, event) and the actions. */
export function PostCard({ post, ...actions }: { post: Post } & PostCardActions) {
  const { t } = useTranslation('community');
  const theme = useTheme();
  const surface = useSurfaceStyle();
  const a = usePostActions(post, { onDeleted: actions.onDeleted });
  const [menu, setMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const needLogin = (fn: () => void) => () => (a.authenticated ? fn() : actions.onRequireLogin());
  const bookable =
    actions.onBook &&
    post.author.kind === 'BARBERSHOP' &&
    (post.type === 'PROMOTION' || post.type === 'WORK');
  return (
    <View style={[styles.card, surface]} testID={`post-${post.id}`}>
      <View style={styles.author}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={post.author.name}
          onPress={() => actions.onOpenAuthor(post.author)}
          style={styles.authorLink}
        >
          <Monogram name={post.author.name} size={sizes.avatarSmall} imageUrl={post.author.photoUrl} />
          <View style={styles.flex}>
            <View style={styles.nameRow}>
              <Text variant="bodyStrong" numberOfLines={1} style={styles.shrink}>
                {post.author.name}
              </Text>
              {post.author.verified ? (
                <Icon name="checkmark-circle" size={sizes.icon} color={theme.colors.primary} />
              ) : null}
            </View>
            <View style={styles.nameRow}>
              <Icon name={TYPE_ICON[post.type]} size={CAPTION_ICON} color={theme.colors.primary} />
              <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.shrink}>
                {[
                  t(`typeOne.${post.type}`),
                  formatShortDate(post.createdAt, zone),
                  post.distanceKm !== null ? t('distance', { km: post.distanceKm.toFixed(1) }) : null,
                  post.editedAt ? t('edited') : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('more')}
          onPress={() => setMenu(true)}
          style={styles.iconButton}
          testID={`post-more-${post.id}`}
        >
          <Icon name="ellipsis-horizontal" size={ACTION_ICON} color={theme.colors.textSecondary} />
        </Pressable>
      </View>
      {post.pinned ? (
        <View style={styles.nameRow}>
          <Icon name="pin" size={CAPTION_ICON} color={theme.colors.primary} />
          <Text variant="caption" color="primary">
            {t('pinned')}
          </Text>
        </View>
      ) : null}

      {post.media.length > 0 ? (
        <Photos media={post.media} onPress={actions.onOpen ? () => actions.onOpen!(post.id) : undefined} />
      ) : null}

      {post.body ? (
        <Pressable disabled={!actions.onOpen} onPress={() => actions.onOpen?.(post.id)}>
          <Text numberOfLines={actions.onOpen ? 4 : undefined}>{post.body}</Text>
        </Pressable>
      ) : null}

      {post.promotion ? (
        <View
          style={[styles.box, { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.md }]}
        >
          <Text variant="subtitle" color="primary">
            {post.promotion.type === 'PERCENTAGE'
              ? t('promo.PERCENTAGE', { value: post.promotion.value })
              : t('promo.FIXED_AMOUNT', {
                  value: formatMoney({ amount: post.promotion.value, currency: 'PEN' }),
                })}
          </Text>
          <Text>{post.promotion.name}</Text>
          {post.promotion.endsAt ? (
            <Text variant="caption" color="textSecondary">
              {t('promo.until', { date: formatShortDate(post.promotion.endsAt, zone) })}
            </Text>
          ) : null}
        </View>
      ) : null}

      {a.event ? (
        <View
          style={[
            styles.box,
            {
              borderColor: theme.colors.border,
              borderWidth: sizes.borderWidth,
              borderRadius: theme.radius.md,
            },
          ]}
        >
          <View style={styles.inline}>
            <Icon name="calendar" size={sizes.icon} color={theme.colors.primary} />
            <Text variant="bodyStrong">
              {t('event.when', {
                date: formatShortDate(a.event.startsAt, zone),
                time: formatTime(a.event.startsAt, zone),
              })}
            </Text>
          </View>
          <View style={styles.inline}>
            <Icon name="location" size={sizes.icon} color={theme.colors.textMuted} />
            <Text color="textSecondary" style={styles.flex}>
              {a.event.address}
            </Text>
          </View>
          <Text variant="caption" color="textSecondary">
            {[
              t('event.going', { count: a.event.going }),
              t('event.interested', { count: a.event.interested }),
              a.event.capacity !== null ? t('event.spots', { count: a.event.capacity }) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {a.event.full ? <Badge label={t('event.fullBadge')} tone="warning" /> : null}
          <View style={styles.inline}>
            <Chip
              label={t('event.interested')}
              selected={a.attendance === 'INTERESTED'}
              onPress={needLogin(() => a.attend('INTERESTED'))}
            />
            <Chip
              label={t('event.go')}
              selected={a.attendance === 'GOING'}
              onPress={needLogin(() => a.attend('GOING'))}
            />
          </View>
        </View>
      ) : null}

      {bookable ? (
        <Button
          label={post.type === 'PROMOTION' ? t('bookPromo') : t('bookStyle')}
          icon="calendar"
          variant="secondary"
          onPress={() => actions.onBook!(post)}
          fullWidth
        />
      ) : null}

      <View style={styles.actions}>
        <Action
          icon={a.liked ? 'heart' : 'heart-outline'}
          tint={a.liked ? theme.colors.danger : undefined}
          count={a.likes}
          a11y={t('likes', { count: a.likes })}
          selected={a.liked}
          onPress={needLogin(a.toggleLike)}
          testID={`post-like-${post.id}`}
        />
        <Action
          icon="chatbubble-outline"
          count={post.counts.comments}
          a11y={t('commentCount', { count: post.counts.comments })}
          onPress={() => actions.onOpen?.(post.id)}
        />
        <Action icon="paper-plane-outline" a11y={t('share')} onPress={a.share} />
        <View style={styles.flex} />
        <Action
          icon={a.saved ? 'bookmark' : 'bookmark-outline'}
          a11y={t('save')}
          selected={a.saved}
          onPress={needLogin(a.toggleSave)}
        />
      </View>

      <MenuSheet visible={menu} onClose={() => setMenu(false)}>
        <Button
          label={t('reportAction')}
          icon="flag"
          variant="ghost"
          onPress={() => {
            setMenu(false);
            if (a.authenticated) setReporting(true);
            else actions.onRequireLogin();
          }}
          fullWidth
        />
        {post.canPin ? (
          <Button
            label={post.pinned ? t('unpin') : t('pin')}
            icon="pin"
            variant="ghost"
            onPress={() => {
              setMenu(false);
              a.togglePin();
            }}
            fullWidth
          />
        ) : null}
        {post.canDelete ? (
          <Button
            label={t('delete')}
            icon="trash"
            variant="ghost"
            onPress={() => {
              setMenu(false);
              setDeleting(true);
            }}
            fullWidth
          />
        ) : null}
      </MenuSheet>
      <ReportSheet visible={reporting} target="post" targetId={post.id} onClose={() => setReporting(false)} />
      <ConfirmDialog
        visible={deleting}
        title={t('deleteTitle')}
        message={t('deleteMessage')}
        confirmLabel={t('delete')}
        destructive
        loading={a.isRemoving}
        onConfirm={() => {
          setDeleting(false);
          a.remove();
        }}
        onCancel={() => setDeleting(false)}
      />
    </View>
  );
}

/** An icon of the action row, with its count when there is one. */
function Action({
  icon,
  count,
  a11y,
  onPress,
  selected,
  tint,
  testID,
}: {
  icon: IconName;
  count?: number;
  a11y: string;
  onPress: () => void;
  selected?: boolean;
  tint?: string;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={selected !== undefined ? { selected } : undefined}
      onPress={onPress}
      style={styles.action}
      testID={testID}
    >
      <Icon
        name={icon}
        size={ACTION_ICON}
        color={tint ?? (selected ? theme.colors.primary : theme.colors.textPrimary)}
      />
      {count ? (
        <Text variant="label" color="textPrimary">
          {String(count)}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** Photos side by side, swiping (with a counter when there are several). */
function Photos({ media, onPress }: { media: Post['media']; onPress?: () => void }) {
  const theme = useTheme();
  // The card's real width, never guessed from the window: lists add their own margins.
  const [size, setSize] = useState(0);
  const [index, setIndex] = useState(0);
  return (
    <View style={styles.photos} onLayout={(e) => setSize(Math.round(e.nativeEvent.layout.width))}>
      {size > 0 ? (
        <FlatList
          data={media}
          keyExtractor={(m) => m.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / size))}
          renderItem={({ item }) => {
            const uri = mediaUrl(item.url ?? item.thumbUrl);
            return (
              <Pressable disabled={!onPress} onPress={onPress} accessibilityRole="image">
                {uri ? (
                  <Image
                    source={{ uri }}
                    style={{
                      width: size,
                      height: size,
                      borderRadius: theme.radius.md,
                      backgroundColor: theme.colors.surfaceMuted,
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={{ width: size, height: size, backgroundColor: theme.colors.surfaceMuted }} />
                )}
              </Pressable>
            );
          }}
        />
      ) : null}
      {media.length > 1 ? (
        <View
          style={[
            styles.counter,
            { backgroundColor: theme.colors.backdrop, borderRadius: theme.radius.pill },
          ]}
        >
          <Text variant="caption" color="onBrand">{`${index + 1}/${media.length}`}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** A small sheet of options from the bottom. */
export function MenuSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        style={[styles.backdrop, { backgroundColor: theme.colors.backdrop }]}
        onPress={onClose}
        accessibilityLabel={t('actions.close')}
      >
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
              paddingBottom: spacing.lg + insets.bottom,
            },
          ]}
        >
          {children}
          <Button label={t('actions.cancel')} variant="secondary" onPress={onClose} fullWidth />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** "Reportar": the reason (and an optional detail); the answer never says what happened. */
export function ReportSheet({
  visible,
  target,
  targetId,
  onClose,
}: {
  visible: boolean;
  target: ReportTarget;
  targetId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation('community');
  const m = useModeration();
  const [reason, setReason] = useState<ReportReason>('SPAM');
  const [note, setNote] = useState('');
  return (
    <ConfirmDialog
      visible={visible}
      icon="flag"
      title={t('report.title')}
      message={t('report.message')}
      confirmLabel={t('report.send')}
      destructive
      loading={m.isReporting}
      onConfirm={() => {
        m.report(target, targetId, reason, note.trim() || undefined);
        setNote('');
        onClose();
      }}
      onCancel={onClose}
    >
      <View style={styles.reasons}>
        {REPORT_REASONS.map((r) => (
          <Chip
            key={r}
            label={t(`report.reasons.${r}`)}
            selected={reason === r}
            onPress={() => setReason(r)}
          />
        ))}
      </View>
      <TextField label={t('report.note')} value={note} onChangeText={setNote} maxLength={500} />
    </ConfirmDialog>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, gap: spacing.sm, overflow: 'hidden' },
  author: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  authorLink: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touchTarget,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  shrink: { flexShrink: 1 },
  iconButton: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
  photos: { aspectRatio: 1 },
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  box: { padding: spacing.md, gap: spacing.xs },
  actions: { flexDirection: 'row', alignItems: 'center', marginHorizontal: -spacing.sm },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: touchTarget,
    minWidth: touchTarget,
    justifyContent: 'center',
  },
  counter: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    padding: spacing.lg,
    gap: spacing.xs,
    width: '100%',
    maxWidth: sizes.maxContentWidth,
    alignSelf: 'center',
  },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
