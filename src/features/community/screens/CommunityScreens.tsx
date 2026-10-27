import { useState, type ReactNode } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import {
  dmyToIsoDate,
  formatShortDate,
  photosAvailable,
  pickPhoto,
  zonedTimeToIso,
  type PickedPhoto,
} from '@/shared/lib';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import {
  Button,
  Chip,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Icon,
  InfiniteList,
  KeyboardAvoider,
  LoadingState,
  MessageBar,
  Monogram,
  Notice,
  Screen,
  SwitchRow,
  Text,
  TextField,
  translateErrorMessage,
  useNearMe,
} from '@/shared/ui';
import type { Comment, FeedTab, Post, PostType } from '../api/communityApi';
import { FeedTabs, SectionSwitch, TypeFilter } from '../components/FeedFilters';
import { MenuSheet, PostCard, ReportSheet, TYPE_ICON, type PostCardActions } from '../components/PostParts';
import {
  BODY_MAX,
  COMMENT_MAX,
  MEDIA_MAX,
  useCommentActions,
  useCommentComposer,
  useComments,
  useFeed,
  useFollow,
  useModeration,
  useNewPost,
  usePost,
  useSavedPosts,
  type PublishAs,
} from '../hooks/useCommunity';

const TYPES: PostType[] = ['PROMOTION', 'EVENT', 'WORK', 'ANNOUNCEMENT'];
const zone = env.defaultTimeZone;

export type CommunityNavigation = Omit<PostCardActions, 'onOpen' | 'onDeleted'> & {
  onOpenPost: (postId: string) => void;
};

/** "Comunidad": Para ti · Cerca · Siguiendo, filters by type, and "Publicar" for who can. */
export function CommunityScreen({
  nav,
  canPublish,
  onPublish,
  onSaved,
  forums,
}: {
  nav: CommunityNavigation;
  canPublish: boolean;
  onPublish: () => void;
  onSaved?: () => void;
  /** The "Foros" section (questions and answers), shown beside the posts. */
  forums?: ReactNode;
}) {
  const { t } = useTranslation('community');
  const theme = useTheme();
  const [section, setSection] = useState<'posts' | 'forums'>('posts');
  const [tab, setTab] = useState<FeedTab>('forYou');
  const [type, setType] = useState<PostType | undefined>(undefined);
  const nearMe = useNearMe();
  const feed = useFeed({ tab, type, near: nearMe.near ?? undefined });
  const needsLocation = tab === 'nearby' && !nearMe.near;
  return (
    <Screen scroll={false} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text variant="display" style={styles.flex} numberOfLines={1}>
          {t('title')}
        </Text>
        {onSaved && section === 'posts' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('mySaved')}
            onPress={onSaved}
            style={styles.iconButton}
          >
            <Icon name="bookmark-outline" size={sizes.icon} color={theme.colors.textPrimary} />
          </Pressable>
        ) : null}
      </View>
      {forums ? (
        <SectionSwitch
          label={t('sections.label')}
          value={section}
          onChange={setSection}
          options={[
            { value: 'posts', label: t('sections.posts'), icon: 'images' },
            { value: 'forums', label: t('sections.forums'), icon: 'chatbubbles' },
          ]}
        />
      ) : null}
      {section === 'forums' ? (
        forums
      ) : (
        <>
          <View style={styles.filters}>
            <FeedTabs
              label={t('tabs.label')}
              value={tab}
              onChange={setTab}
              options={[
                { value: 'forYou', label: t('tabs.forYou') },
                { value: 'nearby', label: t('tabs.nearby') },
                { value: 'following', label: t('tabs.following') },
              ]}
            />
            <TypeFilter
              value={type}
              onChange={setType}
              options={[
                { value: undefined, label: t('types.all'), icon: 'apps-outline' },
                ...TYPES.map((k) => ({ value: k, label: t(`types.${k}`), icon: TYPE_ICON[k] })),
              ]}
            />
          </View>
          {needsLocation ? (
            <Notice tone="info" message={t('nearbyAsk')}>
              <Button
                label={t('nearbyAction')}
                icon="navigate"
                onPress={nearMe.toggle}
                loading={nearMe.busy}
              />
            </Notice>
          ) : (
            // The list keeps its own margin: it runs over the screen's so cards are not doubly inset.
            <View style={styles.feed}>
              <InfiniteList
                query={feed}
                keyExtractor={(p) => p.id}
                empty={{ title: t(`empty.${tab}`), message: t(`empty.${tab}Text`), icon: 'people-outline' }}
                renderItem={({ item }) => <PostCard post={item} {...nav} onOpen={nav.onOpenPost} />}
              />
            </View>
          )}
          {canPublish ? (
            <View style={styles.fab}>
              <Button label={t('new.fab')} icon="add" onPress={onPublish} />
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

/** "Guardadas". */
export function SavedPostsScreen({ nav }: { nav: CommunityNavigation }) {
  const { t } = useTranslation('community');
  const list = useSavedPosts();
  return (
    <Screen scroll={false}>
      <InfiniteList
        query={list}
        keyExtractor={(p) => p.id}
        empty={{ title: t('savedEmpty'), icon: 'bookmark-outline' }}
        renderItem={({ item }) => <PostCard post={item} {...nav} onOpen={nav.onOpenPost} />}
      />
    </Screen>
  );
}

/** A post with its comments (two levels; replying to a reply mentions the person). */
export function PostScreen({
  postId,
  nav,
  authenticated,
  onDeleted,
}: {
  postId: string;
  nav: CommunityNavigation;
  authenticated: boolean;
  onDeleted: () => void;
}) {
  const { t } = useTranslation('community');
  const theme = useTheme();
  const { query, hidden } = usePost(postId);
  const comments = useComments(postId);
  const composer = useCommentComposer(postId);
  const insets = useSafeAreaInsets();
  if (query.isPending) return <LoadingState />;
  if (hidden) {
    return (
      <Screen>
        <EmptyState title={t('hidden.title')} message={t('hidden.text')} icon="eye-off-outline" />
      </Screen>
    );
  }
  if (query.isError || !query.data) {
    return (
      <Screen>
        <ErrorState message={translateErrorMessage(query.error)} onRetry={() => void query.refetch()} />
      </Screen>
    );
  }
  const post = query.data;
  return (
    <KeyboardAvoider
      style={[styles.fill, { backgroundColor: theme.colors.background }]}
      offset={touchTarget * 2}
    >
      <FlatList
        data={comments.items ?? []}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.thread}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onEndReached={() => {
          if (comments.hasNextPage && !comments.isFetchingNextPage) void comments.fetchNextPage();
        }}
        ListHeaderComponent={
          <View style={styles.thread}>
            <PostCard post={post} {...nav} onDeleted={onDeleted} />
            <Text variant="subtitle">{t('comments.title')}</Text>
            {post.commentsDisabled ? <Notice tone="info" message={t('comments.disabled')} /> : null}
          </View>
        }
        ListEmptyComponent={
          comments.items === undefined ? null : (
            <Text color="textSecondary" align="center">
              {t('comments.empty')}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <CommentThread
            comment={item}
            onReply={(c) => composer.setReplyTo(c)}
            authenticated={authenticated}
            nav={nav}
          />
        )}
      />
      {!post.commentsDisabled ? (
        <View style={{ backgroundColor: theme.colors.background }}>
          {composer.replyTo ? (
            <View style={[styles.replyBar, { backgroundColor: theme.colors.surfaceMuted }]}>
              <Text variant="caption" color="textSecondary" style={styles.flex} numberOfLines={1}>
                {t('comments.replyTo', { name: composer.replyTo.author.username })}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('comments.cancelReply')}
                onPress={() => composer.setReplyTo(null)}
                style={styles.iconButton}
              >
                <Icon name="close" size={sizes.icon} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
          ) : null}
          {composer.error ? <Notice tone="danger" message={composer.error} /> : null}
          {authenticated ? (
            <MessageBar
              value={composer.text}
              onChange={composer.setText}
              onSend={composer.send}
              canSend={composer.canSend}
              sending={composer.isSending}
              placeholder={t('comments.placeholder')}
              label={t('comments.placeholder')}
              sendLabel={t('comments.send')}
              maxLength={COMMENT_MAX}
              testID="comment-input"
            />
          ) : (
            <View
              style={[
                styles.composer,
                { borderTopColor: theme.colors.border, paddingBottom: spacing.md + insets.bottom },
              ]}
            >
              <Button
                label={t('comments.loginToComment')}
                variant="secondary"
                onPress={nav.onRequireLogin}
                fullWidth
              />
            </View>
          )}
        </View>
      ) : null}
    </KeyboardAvoider>
  );
}

function CommentThread({
  comment,
  onReply,
  authenticated,
  nav,
}: {
  comment: Comment;
  onReply: (c: Comment) => void;
  authenticated: boolean;
  nav: CommunityNavigation;
}) {
  const { t } = useTranslation('community');
  const [open, setOpen] = useState(false);
  const replies = useComments(comment.postId, open ? comment.id : null);
  return (
    <View style={styles.commentBlock}>
      <CommentItem comment={comment} onReply={onReply} authenticated={authenticated} nav={nav} />
      {comment.replies > 0 ? (
        <Button
          label={open ? t('comments.hideReplies') : t('comments.replies', { count: comment.replies })}
          variant="ghost"
          onPress={() => setOpen(!open)}
        />
      ) : null}
      {open
        ? (replies.items ?? [])
            .filter((r) => r.id !== comment.id)
            .map((r) => (
              <View key={r.id} style={styles.reply}>
                <CommentItem comment={r} onReply={onReply} authenticated={authenticated} nav={nav} />
              </View>
            ))
        : null}
    </View>
  );
}

function CommentItem({
  comment,
  onReply,
  authenticated,
  nav,
}: {
  comment: Comment;
  onReply: (c: Comment) => void;
  authenticated: boolean;
  nav: CommunityNavigation;
}) {
  const { t } = useTranslation('community');
  const theme = useTheme();
  const a = useCommentActions(comment);
  const m = useModeration();
  const [menu, setMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const needLogin = (fn: () => void) => () => (authenticated ? fn() : nav.onRequireLogin());
  return (
    <View style={styles.comment} testID={`comment-${comment.id}`}>
      <Monogram name={comment.author.username} size={sizes.avatarSmall} imageUrl={comment.author.photoUrl} />
      <View style={styles.flex}>
        <View style={styles.inline}>
          <Text variant="bodyStrong">{`@${comment.author.username}`}</Text>
          {comment.authorIsOfficial ? (
            <Text variant="caption" color="primary">
              {t('comments.official')}
            </Text>
          ) : null}
          {comment.pinned ? <Icon name="pin" size={sizes.icon} color={theme.colors.primary} /> : null}
        </View>
        <Text>
          {comment.mention ? <Text color="primary">{`@${comment.mention.username} `}</Text> : null}
          {comment.body}
        </Text>
        <View style={styles.inline}>
          <Text variant="caption" color="textMuted">
            {formatShortDate(comment.createdAt, zone)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('likes', { count: a.likes })}
            accessibilityState={{ selected: a.liked }}
            onPress={needLogin(a.toggleLike)}
            style={styles.small}
          >
            <Icon
              name={a.liked ? 'heart' : 'heart-outline'}
              size={sizes.icon}
              color={a.liked ? theme.colors.danger : theme.colors.textMuted}
            />
            {a.likes > 0 ? (
              <Text variant="caption" color="textSecondary">
                {String(a.likes)}
              </Text>
            ) : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={needLogin(() => onReply(comment))}
            style={styles.small}
          >
            <Text variant="caption" color="primary">
              {t('comments.reply')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('more')}
            onPress={() => setMenu(true)}
            style={styles.small}
          >
            <Icon name="ellipsis-horizontal" size={sizes.icon} color={theme.colors.textMuted} />
          </Pressable>
        </View>
      </View>
      <MenuSheet visible={menu} onClose={() => setMenu(false)}>
        {comment.canPin ? (
          <Button
            label={comment.pinned ? t('comments.unpin') : t('comments.pin')}
            icon="pin"
            variant="ghost"
            onPress={() => {
              setMenu(false);
              a.togglePin();
            }}
            fullWidth
          />
        ) : null}
        {comment.canDelete ? (
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
        <Button
          label={t('reportAction')}
          icon="flag"
          variant="ghost"
          onPress={() => {
            setMenu(false);
            if (authenticated) setReporting(true);
            else nav.onRequireLogin();
          }}
          fullWidth
        />
        {authenticated && !comment.canEdit ? (
          <Button
            label={t('block.action', { name: comment.author.username })}
            icon="ban"
            variant="ghost"
            onPress={() => {
              setMenu(false);
              setBlocking(true);
            }}
            fullWidth
          />
        ) : null}
      </MenuSheet>
      <ReportSheet
        visible={reporting}
        target="comment"
        targetId={comment.id}
        onClose={() => setReporting(false)}
      />
      <ConfirmDialog
        visible={blocking}
        icon="ban"
        title={t('block.title', { name: comment.author.username })}
        message={t('block.message')}
        confirmLabel={t('block.confirm')}
        destructive
        onConfirm={() => {
          setBlocking(false);
          m.block(comment.author.userId);
        }}
        onCancel={() => setBlocking(false)}
      />
      <ConfirmDialog
        visible={deleting}
        title={t('comments.deleteTitle')}
        message={t('comments.deleteMessage')}
        confirmLabel={t('delete')}
        destructive
        onConfirm={() => {
          setDeleting(false);
          a.remove();
        }}
        onCancel={() => setDeleting(false)}
      />
    </View>
  );
}

/** "Publicar": as which author, type, text, photos (up to 10) and the event's data. */
export function NewPostScreen({
  authors,
  onPublished,
  onCreateProfile,
}: {
  authors: PublishAs[];
  onPublished: (post: Post) => void;
  onCreateProfile: () => void;
}) {
  const { t } = useTranslation('community');
  const theme = useTheme();
  const p = useNewPost({ onPublished });
  const [author, setAuthor] = useState(0);
  const [type, setType] = useState<PostType>('ANNOUNCEMENT');
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [commentsOff, setCommentsOff] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [address, setAddress] = useState('');
  const [capacity, setCapacity] = useState('');
  if (authors.length === 0) {
    return (
      <Screen>
        <EmptyState
          title={t('new.noAuthor')}
          icon="megaphone-outline"
          action={{ label: t('new.createProfile'), onPress: onCreateProfile }}
        />
      </Screen>
    );
  }
  const as = authors[Math.min(author, authors.length - 1)]!;
  const isoDate = dmyToIsoDate(date);
  const eventValid =
    type !== 'EVENT' || (isoDate !== null && /^\d{2}:\d{2}$/.test(time) && address.trim().length > 2);
  const valid = body.trim().length > 0 && body.length <= BODY_MAX && eventValid;
  const addPhoto = async () => {
    const result = await pickPhoto('library');
    if (result.status === 'picked') setPhotos((list) => [...list, result.photo].slice(0, MEDIA_MAX));
  };
  return (
    <Screen>
      {p.error ? <Notice tone="danger" message={p.error} /> : null}
      <Text variant="label" color="textSecondary">
        {t('new.as')}
      </Text>
      <View style={styles.chipsWrap}>
        {authors.map((a, i) => (
          <Chip
            key={a.kind === 'BARBERSHOP' ? a.id : 'me'}
            label={a.kind === 'BARBERSHOP' ? a.name : t('new.asProfile')}
            selected={i === author}
            onPress={() => setAuthor(i)}
          />
        ))}
      </View>
      <Text variant="label" color="textSecondary">
        {t('new.type')}
      </Text>
      <View style={styles.chipsWrap}>
        {TYPES.map((k) => (
          <Chip key={k} label={t(`typeOne.${k}`)} selected={type === k} onPress={() => setType(k)} />
        ))}
      </View>
      <TextField
        label={t('new.body')}
        placeholder={t('new.bodyPlaceholder')}
        value={body}
        onChangeText={setBody}
        multiline
        maxLength={BODY_MAX}
      />
      {type === 'EVENT' ? (
        <View style={styles.section}>
          <View style={styles.header}>
            <View style={styles.flex}>
              <TextField
                label={t('new.eventDate')}
                value={date}
                onChangeText={setDate}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.flex}>
              <TextField
                label={t('new.eventTime')}
                value={time}
                onChangeText={setTime}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
          <TextField
            label={t('new.eventAddress')}
            value={address}
            onChangeText={setAddress}
            maxLength={200}
          />
          <TextField
            label={t('new.eventCapacity')}
            value={capacity}
            onChangeText={(v) => setCapacity(v.replace(/[^\d]/g, ''))}
            keyboardType="number-pad"
            maxLength={5}
          />
          {date && !eventValid ? <Notice tone="warning" message={t('new.eventInvalid')} /> : null}
        </View>
      ) : null}
      <Text variant="label" color="textSecondary">
        {t('new.photos')}
      </Text>
      {photosAvailable() ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {photos.map((photo, i) => (
              <Pressable
                key={photo.uri}
                accessibilityRole="button"
                accessibilityLabel={t('new.removePhoto')}
                onPress={() => setPhotos((list) => list.filter((_, j) => j !== i))}
              >
                <View
                  style={[
                    styles.thumb,
                    { borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceMuted },
                  ]}
                >
                  <Icon name="image" size={sizes.icon} color={theme.colors.textMuted} />
                  <Text variant="caption" color="textMuted">{`${i + 1}`}</Text>
                </View>
              </Pressable>
            ))}
            {photos.length < MEDIA_MAX ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('new.addPhoto')}
                onPress={() => void addPhoto()}
                style={[
                  styles.thumb,
                  {
                    borderRadius: theme.radius.md,
                    borderColor: theme.colors.border,
                    borderWidth: sizes.borderWidth,
                  },
                ]}
              >
                <Icon name="add" size={sizes.icon} color={theme.colors.primary} />
              </Pressable>
            ) : null}
          </ScrollView>
          <Text variant="caption" color="textMuted">
            {t('new.photosHint', { max: MEDIA_MAX })}
          </Text>
        </>
      ) : (
        <Text variant="caption" color="textMuted">
          {t('new.photosSoon')}
        </Text>
      )}
      <SwitchRow title={t('new.commentsOff')} value={commentsOff} onValueChange={setCommentsOff} />
      {p.progress && p.progress.total > 0 ? (
        <Text color="textSecondary">{t('new.uploading', p.progress)}</Text>
      ) : null}
      <Button
        label={t('new.publish')}
        icon="send"
        disabled={!valid}
        loading={p.isPublishing}
        fullWidth
        onPress={() =>
          p.publish(
            {
              type,
              body: body.trim(),
              commentsDisabled: commentsOff,
              ...(as.kind === 'BARBERSHOP' ? { barbershopId: as.id } : {}),
              ...(type === 'EVENT' && isoDate
                ? {
                    event: {
                      startsAt: zonedTimeToIso(isoDate, time, zone),
                      address: address.trim(),
                      ...(Number(capacity) > 0 ? { capacity: Number(capacity) } : {}),
                    },
                  }
                : {}),
            },
            photos,
          )
        }
      />
    </Screen>
  );
}

/** "Seguir" on a barbershop or a professional profile, with its followers. */
export function FollowButton({
  author,
  onRequireLogin,
}: {
  author: { kind: 'BARBERSHOP' | 'PROFESSIONAL'; id: string };
  onRequireLogin: () => void;
}) {
  const { t } = useTranslation('community');
  const f = useFollow(author);
  return (
    <View style={styles.header}>
      <Button
        label={f.following ? t('following') : t('follow')}
        icon={f.following ? 'checkmark' : 'add'}
        variant={f.following ? 'secondary' : 'primary'}
        onPress={f.authenticated ? f.toggle : onRequireLogin}
        loading={f.isToggling}
      />
      {f.followers !== null ? (
        <Text color="textSecondary">{t('followers', { count: f.followers })}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconButton: {
    minWidth: touchTarget,
    minHeight: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: { gap: spacing.xs },
  chips: { gap: spacing.sm, paddingVertical: spacing.xs },
  feed: { flex: 1, marginHorizontal: -spacing.gutter, marginBottom: -spacing.lg },
  replyBar: { flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.md },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  section: { gap: spacing.sm },
  fab: { position: 'absolute', right: spacing.gutter, bottom: spacing.xxxl * 2 },
  thread: { gap: spacing.md, padding: spacing.gutter },
  composer: { padding: spacing.md, gap: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth },
  commentBlock: { gap: spacing.xs },
  comment: { flexDirection: 'row', gap: spacing.sm },
  reply: { marginLeft: sizes.avatarSmall + spacing.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  small: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    minHeight: touchTarget,
    minWidth: touchTarget / 2,
  },
  thumb: {
    width: sizes.avatar + spacing.lg,
    height: sizes.avatar + spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
