import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { daysFromToday, formatShortDate, formatTime } from '@/shared/lib';
import { sizes, spacing, touchTarget, useTheme, type StatusTone } from '@/shared/theme';
import { Chip, Icon, InfiniteList, Notice, Text, type IconName } from '@/shared/ui';
import type { AppNotification, NotificationResource } from '../api/notificationsApi';
import { useInbox } from '../hooks/useNotifications';

const zone = env.defaultTimeZone;

const RESOURCE_ICON: Record<NotificationResource['type'], IconName> = {
  booking: 'calendar',
  review: 'star',
  ticket: 'chatbubbles',
  barbershop: 'storefront',
  account: 'shield-checkmark',
  conversation: 'chatbubble-ellipses',
  job_application: 'briefcase',
};

/** Notices that ask for a quick reaction get their own look (a freed slot goes to whoever books first). */
const URGENT_TYPES = new Set(['WAITLIST_SLOT_FREED']);

const TONE_COLORS: Record<
  StatusTone,
  readonly [
    'statusPendingBg' | 'statusSuccessBg' | 'statusNeutralBg' | 'statusDangerBg' | 'primarySoft',
    'statusPendingFg' | 'statusSuccessFg' | 'statusNeutralFg' | 'statusDangerFg' | 'primary',
  ]
> = {
  pending: ['statusPendingBg', 'statusPendingFg'],
  success: ['statusSuccessBg', 'statusSuccessFg'],
  neutral: ['primarySoft', 'primary'],
  danger: ['statusDangerBg', 'statusDangerFg'],
};

type Group = 'today' | 'yesterday' | 'week' | 'older';
type Row = { kind: 'group'; group: Group } | { kind: 'item'; item: AppNotification };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function groupOf(iso: string): Group {
  const days = -daysFromToday(iso, zone);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return 'week';
  return 'older';
}

/** Notices with a day title before each group, in the order the API sends them (newest first). */
function withGroups(items: AppNotification[]): Row[] {
  const rows: Row[] = [];
  let last: Group | null = null;
  for (const item of items) {
    const group = groupOf(item.createdAt);
    if (group !== last) {
      rows.push({ kind: 'group', group });
      last = group;
    }
    rows.push({ kind: 'item', item });
  }
  return rows;
}

/** Inbox of notices: every notice lands here, even when the push did not arrive. */
export function InboxScreen({ onOpen }: { onOpen: (resource: NotificationResource, type: string) => void }) {
  const { t } = useTranslation('notifications');
  const inbox = useInbox();
  const [onlyUnread, setOnlyUnread] = useState(false);
  const unreadCount = inbox.list.items?.filter((n) => n.readAt === null).length ?? 0;
  const rows = useMemo(() => {
    const items = inbox.list.items;
    if (!items) return undefined;
    return withGroups(onlyUnread ? items.filter((n) => n.readAt === null) : items);
  }, [inbox.list.items, onlyUnread]);

  return (
    <InfiniteList
      query={{ ...inbox.list, items: rows }}
      keyExtractor={(row) => (row.kind === 'group' ? `group-${row.group}` : row.item.id)}
      renderItem={({ item: row }) =>
        row.kind === 'group' ? (
          <Text variant="label" color="textSecondary" accessibilityRole="header" style={styles.group}>
            {t(`groups.${row.group}`)}
          </Text>
        ) : (
          <NotificationRow
            notification={row.item}
            onPress={() => {
              inbox.open(row.item);
              onOpen(row.item.resource, row.item.type);
            }}
          />
        )
      }
      empty={
        onlyUnread
          ? { title: t('emptyUnread'), icon: 'checkmark-done-outline' }
          : { title: t('empty'), message: t('emptyMessage'), icon: 'notifications-off-outline' }
      }
      header={
        <View style={styles.header}>
          {inbox.error ? <Notice tone="danger" message={inbox.error} /> : null}
          <View style={styles.toolbar}>
            <View style={styles.chips}>
              <Chip label={t('filters.all')} selected={!onlyUnread} onPress={() => setOnlyUnread(false)} />
              <Chip
                label={
                  unreadCount > 0 ? t('filters.unreadCount', { count: unreadCount }) : t('filters.unread')
                }
                selected={onlyUnread}
                onPress={() => setOnlyUnread(true)}
              />
            </View>
            {inbox.hasUnread ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('readAll')}
                accessibilityState={{ busy: inbox.isReadingAll }}
                disabled={inbox.isReadingAll}
                onPress={inbox.readAll}
                style={styles.readAll}
              >
                <IconLink />
              </Pressable>
            ) : null}
          </View>
        </View>
      }
    />
  );
}

/** "Marcar todo como leído" as a quiet link with a double check. */
function IconLink() {
  const { t } = useTranslation('notifications');
  const theme = useTheme();
  return (
    <>
      <Icon name="checkmark-done" size={sizes.icon} color={theme.colors.primary} />
      <Text variant="label" color="primary">
        {t('readAllShort')}
      </Text>
    </>
  );
}

/** One notice: colored icon by kind, title (bold while new), two lines of text and how long ago. */
function NotificationRow({ notification, onPress }: { notification: AppNotification; onPress: () => void }) {
  const { t } = useTranslation('notifications');
  const theme = useTheme();
  const unread = notification.readAt === null;
  const urgent = URGENT_TYPES.has(notification.type);
  const tone: StatusTone = urgent
    ? 'success'
    : notification.resource.type === 'account'
      ? 'pending'
      : 'neutral';
  const [bg, fg] = TONE_COLORS[tone];
  const icon: IconName = urgent ? 'flash' : RESOURCE_ICON[notification.resource.type];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[unread ? t('unread') : null, notification.title, notification.body]
        .filter(Boolean)
        .join('. ')}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderRadius: theme.radius.lg,
          backgroundColor: pressed ? theme.colors.primarySoft : unread ? theme.colors.surface : 'transparent',
          borderColor: urgent && unread ? theme.colors.success : 'transparent',
        },
      ]}
      testID={`notification-${notification.id}`}
    >
      <View style={[styles.icon, { backgroundColor: theme.colors[bg] }]}>
        <Icon name={icon} size={sizes.icon} color={theme.colors[fg]} />
      </View>
      <View style={styles.texts}>
        <View style={styles.titleRow}>
          <Text variant={unread ? 'bodyStrong' : 'body'} style={styles.flex} numberOfLines={2}>
            {notification.title}
          </Text>
          <Text variant="caption" color={unread ? 'primary' : 'textMuted'}>
            {timeAgo(notification.createdAt, t)}
          </Text>
        </View>
        <Text variant="caption" color="textSecondary" numberOfLines={2}>
          {notification.body}
        </Text>
        {unread ? (
          <View style={styles.newRow}>
            <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
            <Text variant="caption" color="primary">
              {t('unread')}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

type T = ReturnType<typeof useTranslation<'notifications'>>['t'];

/** "Ahora", "hace 5 min", "10:30" (today), "Ayer" or the date. */
function timeAgo(iso: string, t: T, now: number = Date.now()): string {
  const elapsed = now - new Date(iso).getTime();
  const days = -daysFromToday(iso, zone);
  if (elapsed < MINUTE) return t('ago.now');
  if (elapsed < HOUR) return t('ago.minutes', { count: Math.floor(elapsed / MINUTE) });
  if (days <= 0) return formatTime(iso, zone);
  if (days === 1) return t('ago.yesterday');
  return formatShortDate(iso, zone);
}

const ICON = touchTarget;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: spacing.sm },
  toolbar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  chips: { flexDirection: 'row', gap: spacing.xs, flex: 1 },
  readAll: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, minHeight: touchTarget },
  group: { marginTop: spacing.sm },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
  },
  icon: { width: ICON, height: ICON, borderRadius: ICON / 2, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: spacing.xxs },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  newRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: spacing.sm, height: spacing.sm, borderRadius: spacing.xs },
});
