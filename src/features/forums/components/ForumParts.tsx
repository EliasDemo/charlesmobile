import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { MenuSheet, ReportSheet } from '@/features/community';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { formatShortDate } from '@/shared/lib';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import {
  Button,
  ConfirmDialog,
  Icon,
  Monogram,
  Text,
  TextField,
  useSurfaceStyle,
  type IconName,
} from '@/shared/ui';
import type { ForumCategory, Reply, Thread, ThreadSummary } from '../api/forumsApi';
import { useForumCategories, useReplyActions } from '../hooks/useForums';
import { REPLY_MAX } from '../schemas/forumSchemas';

const zone = env.defaultTimeZone;

/** Topic pills with the topic's own color dot; the selected one fills with that color. */
export function TopicPills({
  topics,
  value,
  onChange,
  allLabel,
}: {
  topics: ForumCategory[];
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  allLabel: string;
}) {
  const theme = useTheme();
  const colorOf = useTopicColor();
  const options: { id: string | undefined; name: string }[] = [{ id: undefined, name: allLabel }, ...topics];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bleed}
      contentContainerStyle={styles.pills}
    >
      {options.map((o) => {
        const selected = o.id === value;
        const color = o.id ? colorOf(o.id) : theme.colors.brand;
        return (
          <Pressable
            key={o.id ?? 'all'}
            accessibilityRole="button"
            accessibilityLabel={o.name}
            accessibilityState={{ selected }}
            onPress={() => onChange(selected ? undefined : o.id)}
            style={styles.pillTouch}
          >
            <View
              style={[
                styles.pill,
                {
                  borderRadius: theme.radius.pill,
                  backgroundColor: selected ? color : theme.colors.surface,
                  borderColor: selected ? color : theme.colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.topicDot,
                  {
                    backgroundColor: selected ? theme.colors.onPrimary : color,
                    borderRadius: theme.radius.pill,
                  },
                ]}
              />
              <Text variant="label" color={selected ? 'onPrimary' : 'textPrimary'} numberOfLines={1}>
                {o.name}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Text tabs with an icon and a copper underline on the selected one. */
export function SortTabs<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon: IconName }[];
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={[styles.tabs, { borderBottomColor: theme.colors.border }]}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={styles.tab}
          >
            <View style={styles.tabLabel}>
              <Icon
                name={o.icon}
                size={sizes.icon - spacing.sm}
                color={selected ? theme.colors.primary : theme.colors.textMuted}
              />
              <Text
                variant={selected ? 'bodyStrong' : 'body'}
                color={selected ? 'textPrimary' : 'textSecondary'}
                numberOfLines={1}
              >
                {o.label}
              </Text>
            </View>
            <View
              style={[
                styles.underline,
                {
                  backgroundColor: selected ? theme.colors.primary : 'transparent',
                  borderRadius: theme.radius.pill,
                },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
type Author = ThreadSummary['author'];

/** @username, the "Barbero" badge and when. */
export function AuthorLine({ author, at, edited }: { author: Author; at: string; edited?: boolean }) {
  const { t } = useTranslation('forums');
  const theme = useTheme();
  return (
    <View style={styles.author}>
      <Monogram name={author.username} size={sizes.avatarSmall - spacing.sm} imageUrl={author.photoUrl} />
      <Text variant="label" numberOfLines={1} style={styles.shrink}>
        {`@${author.username}`}
      </Text>
      {author.isBarber ? (
        <View
          style={[
            styles.barber,
            { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.pill },
          ]}
        >
          <Icon name="cut" size={sizes.icon - spacing.sm} color={theme.colors.primary} />
          <Text variant="caption" color="primary">
            {t('barber')}
          </Text>
        </View>
      ) : null}
      <Text variant="caption" color="textMuted" numberOfLines={1}>
        {`· ${formatShortDate(at, zone)}${edited ? ` · ${t('edited')}` : ''}`}
      </Text>
    </View>
  );
}

/** One color per topic, from the theme, in the order the topics come (stable while browsing). */
export function useTopicColor() {
  const theme = useTheme();
  const categories = useForumCategories();
  const palette = [
    theme.colors.primary,
    theme.colors.statusSuccessFg,
    theme.colors.medalSilver,
    theme.colors.statusPendingFg,
    theme.colors.statusDangerFg,
    theme.colors.medalGold,
  ];
  return (categoryId: string | undefined) => {
    const index = categories.data?.findIndex((c) => c.id === categoryId) ?? -1;
    return index < 0 ? theme.colors.primary : palette[index % palette.length]!;
  };
}

/** 📌 fixed, 🔒 closed and ✓ solved as small pills, always with words (never color alone). */
export function ThreadMarks({ thread }: { thread: Pick<ThreadSummary, 'pinned' | 'locked' | 'solved'> }) {
  const { t } = useTranslation('forums');
  const theme = useTheme();
  const marks = [
    thread.solved
      ? {
          icon: 'checkmark-circle' as const,
          label: t('marks.solved'),
          fg: theme.colors.statusSuccessFg,
          bg: theme.colors.statusSuccessBg,
        }
      : null,
    thread.pinned
      ? {
          icon: 'pin' as const,
          label: t('marks.pinned'),
          fg: theme.colors.primary,
          bg: theme.colors.primarySoft,
        }
      : null,
    thread.locked
      ? {
          icon: 'lock-closed' as const,
          label: t('marks.locked'),
          fg: theme.colors.statusNeutralFg,
          bg: theme.colors.statusNeutralBg,
        }
      : null,
  ].filter((m) => m !== null);
  if (marks.length === 0) return null;
  return (
    <View style={styles.marks}>
      {marks.map((m) => (
        <View
          key={m.label}
          style={[styles.markPill, { backgroundColor: m.bg, borderRadius: theme.radius.pill }]}
        >
          <Icon name={m.icon} size={sizes.icon - spacing.sm} color={m.fg} />
          <Text variant="caption" style={{ color: m.fg }}>
            {m.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * A thread in the list: a colored bar for its topic, the question in big type, who asked, and an
 * answer bubble that turns green when it is solved.
 */
export function ThreadRow({ thread, onOpen }: { thread: ThreadSummary; onOpen: () => void }) {
  const { t } = useTranslation('forums');
  const theme = useTheme();
  const surface = useSurfaceStyle();
  const topicColor = useTopicColor()(thread.categoryId);
  const answered = thread.replyCount > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={thread.title}
      onPress={onOpen}
      style={({ pressed }) => [styles.row, surface, pressed && styles.pressed]}
      testID={`thread-${thread.id}`}
    >
      <View
        style={[
          styles.accent,
          {
            backgroundColor: topicColor,
            borderTopLeftRadius: theme.radius.lg,
            borderBottomLeftRadius: theme.radius.lg,
          },
        ]}
      />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <View style={styles.topic}>
            <View
              style={[styles.topicDot, { backgroundColor: topicColor, borderRadius: theme.radius.pill }]}
            />
            <Text variant="caption" numberOfLines={1} style={[styles.shrink, { color: topicColor }]}>
              {thread.categoryName}
            </Text>
          </View>
          <ThreadMarks thread={thread} />
        </View>
        <Text variant="subtitle" numberOfLines={3}>
          {thread.title}
        </Text>
        {thread.excerpt ? (
          <Text color="textSecondary" numberOfLines={2}>
            {thread.excerpt}
          </Text>
        ) : null}
        <View style={styles.rowBottom}>
          <View style={styles.flex}>
            <AuthorLine author={thread.author} at={thread.lastActivityAt} />
          </View>
          <View
            style={[
              styles.bubble,
              {
                borderRadius: theme.radius.pill,
                backgroundColor: thread.solved
                  ? theme.colors.statusSuccessBg
                  : answered
                    ? theme.colors.primarySoft
                    : theme.colors.statusPendingBg,
              },
            ]}
            accessibilityLabel={answered ? t('replies', { count: thread.replyCount }) : t('noReplies')}
          >
            <Icon
              name={thread.solved ? 'checkmark-done' : answered ? 'chatbubbles' : 'help'}
              size={sizes.icon - spacing.sm}
              color={
                thread.solved
                  ? theme.colors.statusSuccessFg
                  : answered
                    ? theme.colors.primary
                    : theme.colors.statusPendingFg
              }
            />
            <Text
              variant="label"
              style={{
                color: thread.solved
                  ? theme.colors.statusSuccessFg
                  : answered
                    ? theme.colors.primary
                    : theme.colors.statusPendingFg,
              }}
            >
              {answered ? String(thread.replyCount) : t('noRepliesShort')}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/**
 * An answer. The best one is highlighted with ✓; "Me sirvió" on each (not on one's own), and
 * "Marcar como la mejor" when the thread is mine.
 */
export function ReplyItem({
  reply,
  thread,
  authenticated,
  onRequireLogin,
}: {
  reply: Reply;
  thread: Pick<Thread, 'id' | 'isMine'>;
  authenticated: boolean;
  onRequireLogin: () => void;
}) {
  const { t } = useTranslation('forums');
  const theme = useTheme();
  const a = useReplyActions(reply, thread);
  const [menu, setMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(reply.body);
  const needLogin = (fn: () => void) => () => (authenticated ? fn() : onRequireLogin());
  const best = reply.isSolution;
  const surface = useSurfaceStyle();
  return (
    <View
      style={[
        styles.reply,
        surface,
        best && { borderWidth: sizes.borderWidth * 2, borderColor: theme.colors.success },
      ]}
      testID={`reply-${reply.id}`}
    >
      {best ? (
        <View
          style={[
            styles.bestBand,
            {
              backgroundColor: theme.colors.statusSuccessBg,
              borderTopLeftRadius: theme.radius.lg,
              borderTopRightRadius: theme.radius.lg,
            },
          ]}
        >
          <Icon name="trophy" size={sizes.icon - spacing.xs} color={theme.colors.statusSuccessFg} />
          <Text variant="label" style={{ color: theme.colors.statusSuccessFg }}>
            {t('reply.best')}
          </Text>
          <Icon name="checkmark-circle" size={sizes.icon - spacing.xs} color={theme.colors.statusSuccessFg} />
        </View>
      ) : null}
      <View style={styles.rowTop}>
        <View style={styles.flex}>
          <AuthorLine author={reply.author} at={reply.createdAt} edited={reply.editedAt !== null} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('more')}
          onPress={() => setMenu(true)}
          style={styles.iconButton}
        >
          <Icon name="ellipsis-horizontal" size={sizes.icon} color={theme.colors.textSecondary} />
        </Pressable>
      </View>
      <Text selectable>{reply.body}</Text>
      <View style={styles.actions}>
        {a.canVote ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('reply.helpful', { count: a.count })}
            accessibilityState={{ selected: a.voted }}
            onPress={needLogin(a.toggleHelpful)}
            style={[
              styles.helpful,
              {
                borderRadius: theme.radius.pill,
                borderColor: a.voted ? theme.colors.primary : theme.colors.border,
                backgroundColor: a.voted ? theme.colors.primarySoft : 'transparent',
              },
            ]}
          >
            <Icon
              name={a.voted ? 'thumbs-up' : 'thumbs-up-outline'}
              size={sizes.icon - spacing.xs}
              color={a.voted ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text variant="label" color={a.voted ? 'primary' : 'textSecondary'}>
              {t('reply.helpful', { count: a.count })}
            </Text>
          </Pressable>
        ) : a.count > 0 ? (
          <Text variant="caption" color="textSecondary">
            {t('reply.helpful', { count: a.count })}
          </Text>
        ) : null}
        {a.canMarkBest ? (
          <Button
            label={best ? t('reply.unmarkBest') : t('reply.markBest')}
            icon={best ? 'close-circle-outline' : 'checkmark-circle-outline'}
            variant="ghost"
            onPress={() => a.setBest(!best)}
            loading={a.isMarking}
          />
        ) : null}
      </View>

      <MenuSheet visible={menu} onClose={() => setMenu(false)}>
        {reply.isMine ? (
          <>
            <Button
              label={t('edit')}
              icon="create-outline"
              variant="ghost"
              onPress={() => {
                setMenu(false);
                setDraft(reply.body);
                setEditing(true);
              }}
              fullWidth
            />
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
          </>
        ) : (
          <Button
            label={t('report')}
            icon="flag"
            variant="ghost"
            onPress={() => {
              setMenu(false);
              if (authenticated) setReporting(true);
              else onRequireLogin();
            }}
            fullWidth
          />
        )}
      </MenuSheet>
      <ReportSheet
        visible={reporting}
        target="forum_reply"
        targetId={reply.id}
        onClose={() => setReporting(false)}
      />
      <ConfirmDialog
        visible={deleting}
        title={t('reply.deleteTitle')}
        message={best ? t('reply.deleteBestMessage') : t('reply.deleteMessage')}
        confirmLabel={t('delete')}
        destructive
        onConfirm={() => {
          setDeleting(false);
          a.remove();
        }}
        onCancel={() => setDeleting(false)}
      />
      <ConfirmDialog
        visible={editing}
        title={t('reply.editTitle')}
        message={t('reply.editMessage')}
        confirmLabel={t('save')}
        icon="create-outline"
        loading={a.isEditing}
        confirmDisabled={draft.trim().length === 0 || draft.trim() === reply.body}
        onConfirm={() => a.edit(draft, () => setEditing(false))}
        onCancel={() => setEditing(false)}
      >
        <TextField
          label={t('reply.label')}
          value={draft}
          onChangeText={setDraft}
          multiline
          maxLength={REPLY_MAX}
        />
      </ConfirmDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bleed: { flexGrow: 0, marginHorizontal: -spacing.gutter },
  pills: { paddingHorizontal: spacing.gutter, gap: spacing.xs },
  pillTouch: { minHeight: touchTarget, justifyContent: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + spacing.xxs,
    borderWidth: sizes.borderWidth,
  },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', minHeight: touchTarget, gap: spacing.xs },
  tabLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  underline: { height: spacing.xs - 1, alignSelf: 'stretch', marginHorizontal: spacing.md },
  shrink: { flexShrink: 1 },
  author: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  barber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  marks: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  mark: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  row: { flexDirection: 'row' },
  pressed: { opacity: 0.85 },
  accent: { width: spacing.xs },
  rowBody: { flex: 1, padding: spacing.md, gap: spacing.xs },
  topic: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  topicDot: { width: spacing.sm, height: spacing.sm },
  markPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  reply: { padding: spacing.md, gap: spacing.sm, overflow: 'hidden' },
  bestBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: -spacing.md,
    marginTop: -spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconButton: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  helpful: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
    borderWidth: sizes.borderWidth,
  },
});
