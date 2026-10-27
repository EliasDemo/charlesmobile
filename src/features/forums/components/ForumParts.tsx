import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MenuSheet, ReportSheet } from '@/features/community';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { formatShortDate } from '@/shared/lib';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Button, ConfirmDialog, Icon, Monogram, Text, TextField } from '@/shared/ui';
import type { Reply, Thread, ThreadSummary } from '../api/forumsApi';
import { useReplyActions } from '../hooks/useForums';
import { REPLY_MAX } from '../schemas/forumSchemas';

const zone = env.defaultTimeZone;
type Author = ThreadSummary['author'];

/** @username, the "Barbero" badge and when. */
export function AuthorLine({ author, at, edited }: { author: Author; at: string; edited?: boolean }) {
  const { t } = useTranslation('forums');
  const theme = useTheme();
  return (
    <View style={styles.author}>
      <Monogram name={author.username} size={sizes.avatarSmall} imageUrl={author.photoUrl} />
      <Text variant="bodyStrong" numberOfLines={1} style={styles.shrink}>
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

/** 📌 fixed, 🔒 closed and ✓ solved, always with words (never color alone). */
export function ThreadMarks({ thread }: { thread: Pick<ThreadSummary, 'pinned' | 'locked' | 'solved'> }) {
  const { t } = useTranslation('forums');
  const theme = useTheme();
  const marks = [
    thread.pinned ? { icon: 'pin' as const, label: t('marks.pinned'), color: theme.colors.primary } : null,
    thread.solved
      ? { icon: 'checkmark-circle' as const, label: t('marks.solved'), color: theme.colors.success }
      : null,
    thread.locked
      ? { icon: 'lock-closed' as const, label: t('marks.locked'), color: theme.colors.textMuted }
      : null,
  ].filter((m) => m !== null);
  if (marks.length === 0) return null;
  return (
    <View style={styles.marks}>
      {marks.map((m) => (
        <View key={m.label} style={styles.mark}>
          <Icon name={m.icon} size={sizes.icon - spacing.xs} color={m.color} />
          <Text variant="caption" color="textSecondary">
            {m.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** A thread in the list: the question, its topic, who asked and how many answers. */
export function ThreadRow({ thread, onOpen }: { thread: ThreadSummary; onOpen: () => void }) {
  const { t } = useTranslation('forums');
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={thread.title}
      onPress={onOpen}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderColor: thread.solved ? theme.colors.success : theme.colors.border,
        },
      ]}
      testID={`thread-${thread.id}`}
    >
      <View style={styles.rowTop}>
        <Text variant="caption" color="primary" numberOfLines={1} style={styles.shrink}>
          {thread.categoryName}
        </Text>
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
          <AuthorLine author={thread.author} at={thread.createdAt} />
        </View>
        <View style={styles.mark}>
          <Icon
            name="chatbubbles-outline"
            size={sizes.icon - spacing.xs}
            color={theme.colors.textSecondary}
          />
          <Text variant="caption" color="textSecondary">
            {thread.replyCount === 0 ? t('noReplies') : t('replies', { count: thread.replyCount })}
          </Text>
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
  return (
    <View
      style={[
        styles.reply,
        {
          backgroundColor: best ? theme.colors.statusSuccessBg : theme.colors.surface,
          borderColor: best ? theme.colors.success : theme.colors.border,
          borderRadius: theme.radius.lg,
        },
      ]}
      testID={`reply-${reply.id}`}
    >
      {best ? (
        <View style={styles.mark}>
          <Icon name="checkmark-circle" size={sizes.icon} color={theme.colors.statusSuccessFg} />
          <Text variant="label" color="success">
            {t('reply.best')}
          </Text>
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
  shrink: { flexShrink: 1 },
  author: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  barber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  marks: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  mark: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  row: { padding: spacing.md, gap: spacing.xs, borderWidth: StyleSheet.hairlineWidth },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  reply: { padding: spacing.md, gap: spacing.sm, borderWidth: StyleSheet.hairlineWidth },
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
