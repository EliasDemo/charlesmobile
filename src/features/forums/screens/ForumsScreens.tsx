import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Controller } from 'react-hook-form';
import { MenuSheet, ReportSheet } from '@/features/community';
import { useTranslation } from '@/shared/i18n';
import { useDebouncedValue } from '@/shared/lib';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import {
  BrandHero,
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
  Notice,
  QueryView,
  Screen,
  SearchField,
  SegmentedControl,
  Text,
  TextField,
  translateErrorMessage,
  useFieldErrorText,
  useSurfaceStyle,
} from '@/shared/ui';
import type { ReplySort, Thread, ThreadSort } from '../api/forumsApi';
import {
  AuthorLine,
  ReplyItem,
  SortTabs,
  ThreadMarks,
  ThreadRow,
  TopicPills,
  useTopicColor,
} from '../components/ForumParts';
import {
  useAskThread,
  useForumCategories,
  useReplies,
  useReplyComposer,
  useThread,
  useThreadActions,
  useThreads,
} from '../hooks/useForums';
import { REPLY_MAX, THREAD_BODY_MAX, TITLE_MAX, TITLE_MIN } from '../schemas/forumSchemas';

const SEARCH_DELAY = 400;

/**
 * "Foros", inside Comunidad: topics, search and the list of questions, with "Preguntar". Reading
 * is public; asking needs a session. No advertising here (TIENDA.md).
 */
export function ForumsHome({
  authenticated,
  onOpenThread,
  onAsk,
  onRequireLogin,
}: {
  authenticated: boolean;
  onOpenThread: (id: string) => void;
  onAsk: (categoryId?: string) => void;
  onRequireLogin: () => void;
}) {
  const { t } = useTranslation('forums');
  const categories = useForumCategories();
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<ThreadSort>('recent');
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), SEARCH_DELAY);
  const threads = useThreads({ categoryId, sort, ...(q ? { q } : {}) });
  return (
    <View style={styles.fill}>
      <View style={styles.filters}>
        <SearchField value={search} onChangeText={setSearch} placeholder={t('search')} label={t('search')} />
        {(categories.data?.length ?? 0) > 0 ? (
          <TopicPills
            value={categoryId}
            onChange={setCategoryId}
            allLabel={t('allTopics')}
            topics={categories.data!}
          />
        ) : null}
        <SortTabs
          label={t('sort.label')}
          value={sort}
          onChange={setSort}
          options={[
            { value: 'recent', label: t('sort.recent'), icon: 'flash' },
            { value: 'new', label: t('sort.new'), icon: 'sparkles' },
            { value: 'unanswered', label: t('sort.unanswered'), icon: 'help-circle' },
          ]}
        />
      </View>
      <View style={styles.list}>
        <InfiniteList
          query={threads}
          keyExtractor={(th) => th.id}
          header={
            <View style={styles.item}>
              <BrandHero
                compact
                eyebrow={t('hero.eyebrow')}
                title={t('hero.title')}
                subtitle={t('hero.subtitle')}
                icon="chatbubbles"
              />
            </View>
          }
          empty={{
            title: q ? t('empty.search') : t('empty.title'),
            message: q ? undefined : t('empty.text'),
            icon: 'chatbubbles-outline',
          }}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <ThreadRow thread={item} onOpen={() => onOpenThread(item.id)} />
            </View>
          )}
        />
      </View>
      <View style={styles.fab}>
        <Button
          label={t('ask.fab')}
          icon="add-circle"
          onPress={() => (authenticated ? onAsk(categoryId) : onRequireLogin())}
        />
      </View>
    </View>
  );
}

/** A thread: the question, the answers (the best one first, with ✓) and the answer box. */
export function ThreadScreen({
  threadId,
  authenticated,
  onRequireLogin,
  onDeleted,
}: {
  threadId: string;
  authenticated: boolean;
  onRequireLogin: () => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation('forums');
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { query, hidden } = useThread(threadId);
  const [sort, setSort] = useState<ReplySort>('oldest');
  const replies = useReplies(threadId, sort);
  const composer = useReplyComposer(threadId);
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
  const thread = query.data;
  return (
    <KeyboardAvoider
      style={[styles.fill, { backgroundColor: theme.colors.background }]}
      offset={touchTarget * 2}
    >
      <FlatList
        data={replies.items ?? []}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.thread}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        refreshing={replies.isRefetching}
        onRefresh={() => {
          void query.refetch();
          void replies.refetch();
        }}
        onEndReached={() => {
          if (replies.hasNextPage && !replies.isFetchingNextPage) void replies.fetchNextPage();
        }}
        ListHeaderComponent={
          <View style={styles.thread}>
            <Question
              thread={thread}
              authenticated={authenticated}
              onRequireLogin={onRequireLogin}
              onDeleted={onDeleted}
            />
            <View style={styles.repliesHeader}>
              <Text variant="title" style={styles.flex}>
                {thread.replyCount === 0 ? t('noReplies') : t('replies', { count: thread.replyCount })}
              </Text>
            </View>
            {thread.replyCount > 1 ? (
              <SegmentedControl
                label={t('sort.label')}
                hideLabel
                value={sort}
                onChange={setSort}
                options={[
                  { value: 'oldest', label: t('sort.oldest') },
                  { value: 'helpful', label: t('sort.helpful') },
                ]}
              />
            ) : null}
            {replies.error && !replies.items ? (
              <ErrorState
                message={translateErrorMessage(replies.error)}
                onRetry={() => void replies.refetch()}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          replies.items === undefined ? null : (
            <Text color="textSecondary" align="center">
              {thread.locked ? t('thread.lockedEmpty') : t('beFirst')}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <ReplyItem
            reply={item}
            thread={thread}
            authenticated={authenticated}
            onRequireLogin={onRequireLogin}
          />
        )}
      />
      <View style={{ backgroundColor: theme.colors.background }}>
        {thread.locked ? (
          <View
            style={[
              styles.closed,
              { borderTopColor: theme.colors.border, paddingBottom: spacing.md + insets.bottom },
            ]}
          >
            <Notice tone="info" message={t('thread.locked')} />
          </View>
        ) : authenticated ? (
          <>
            {composer.error ? <Notice tone="danger" message={composer.error} /> : null}
            <MessageBar
              value={composer.text}
              onChange={composer.setText}
              onSend={composer.send}
              canSend={composer.canSend}
              sending={composer.isSending}
              placeholder={t('reply.placeholder')}
              label={t('reply.label')}
              sendLabel={t('reply.send')}
              maxLength={REPLY_MAX}
              testID="reply-input"
            />
          </>
        ) : (
          <View
            style={[
              styles.closed,
              { borderTopColor: theme.colors.border, paddingBottom: spacing.md + insets.bottom },
            ]}
          >
            <Button label={t('reply.loginToAnswer')} variant="secondary" onPress={onRequireLogin} fullWidth />
          </View>
        )}
      </View>
    </KeyboardAvoider>
  );
}

/** The question at the top of the thread, with its menu (edit and delete if mine; report if not). */
function Question({
  thread,
  authenticated,
  onRequireLogin,
  onDeleted,
}: {
  thread: Thread;
  authenticated: boolean;
  onRequireLogin: () => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation('forums');
  const theme = useTheme();
  const actions = useThreadActions(thread.id, { onDeleted });
  const [menu, setMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(thread.title);
  const [body, setBody] = useState(thread.body);
  const titleOk = title.trim().length >= TITLE_MIN && title.trim().length <= TITLE_MAX;
  const surface = useSurfaceStyle();
  const topicColor = useTopicColor()(thread.categoryId);
  return (
    <View style={[styles.question, surface]}>
      {/* Navy band: the topic and the question, like the cover of the thread. */}
      <View
        style={[
          styles.questionBand,
          {
            backgroundColor: theme.colors.brand,
            borderTopLeftRadius: theme.radius.lg,
            borderTopRightRadius: theme.radius.lg,
          },
        ]}
      >
        <View style={styles.repliesHeader}>
          <View style={[styles.topicTag, { backgroundColor: topicColor, borderRadius: theme.radius.pill }]}>
            <Text variant="caption" color="onPrimary" numberOfLines={1}>
              {thread.categoryName}
            </Text>
          </View>
          <View style={styles.flex} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('more')}
            onPress={() => setMenu(true)}
            style={styles.iconButton}
          >
            <Icon name="ellipsis-horizontal" size={sizes.icon} color={theme.colors.onBrand} />
          </Pressable>
        </View>
        <Text variant="title" color="onBrand">
          {thread.title}
        </Text>
      </View>
      <View style={styles.questionBody}>
        <ThreadMarks thread={thread} />
        <AuthorLine author={thread.author} at={thread.createdAt} edited={thread.editedAt !== null} />
        <Text selectable>{thread.body}</Text>
        {thread.isMine && !thread.solved && thread.replyCount > 0 ? (
          <Notice tone="info" message={t('thread.chooseBest')} />
        ) : null}
      </View>

      <MenuSheet visible={menu} onClose={() => setMenu(false)}>
        {thread.isMine ? (
          <>
            <Button
              label={t('edit')}
              icon="create-outline"
              variant="ghost"
              onPress={() => {
                setMenu(false);
                setTitle(thread.title);
                setBody(thread.body);
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
        target="forum_thread"
        targetId={thread.id}
        onClose={() => setReporting(false)}
      />
      <ConfirmDialog
        visible={deleting}
        title={t('thread.deleteTitle')}
        message={t('thread.deleteMessage')}
        confirmLabel={t('delete')}
        destructive
        loading={actions.isRemoving}
        onConfirm={() => {
          setDeleting(false);
          actions.remove();
        }}
        onCancel={() => setDeleting(false)}
      />
      <ConfirmDialog
        visible={editing}
        title={t('thread.editTitle')}
        message={t('thread.editMessage')}
        confirmLabel={t('save')}
        icon="create-outline"
        loading={actions.isEditing}
        confirmDisabled={!titleOk || body.trim().length === 0}
        onConfirm={() => actions.edit({ title, body }, () => setEditing(false))}
        onCancel={() => setEditing(false)}
      >
        <TextField
          label={t('ask.title')}
          value={title}
          onChangeText={setTitle}
          maxLength={TITLE_MAX}
          error={titleOk ? undefined : t('ask.titleLength')}
        />
        <TextField
          label={t('ask.body')}
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={THREAD_BODY_MAX}
        />
      </ConfirmDialog>
    </View>
  );
}

/** "Preguntar": the topic, a clear title and the details. */
export function AskThreadScreen({
  categoryId,
  onCreated,
}: {
  categoryId?: string;
  onCreated: (threadId: string) => void;
}) {
  const { t } = useTranslation('forums');
  const errorText = useFieldErrorText('forums');
  const categories = useForumCategories();
  const ask = useAskThread({ categoryId, onCreated: (thread) => onCreated(thread.id) });
  const { control } = ask.form;
  return (
    <Screen>
      <View style={styles.form}>
        <Text color="textSecondary">{t('ask.intro')}</Text>
        <QueryView query={categories} isEmpty={(c) => c.length === 0} empty={{ title: t('ask.noTopics') }}>
          {(list) => (
            <Controller
              control={control}
              name="categoryId"
              render={({ field, fieldState }) => (
                <View style={styles.field}>
                  <Text variant="label">{t('ask.topic')}</Text>
                  <View style={styles.wrap}>
                    {list.map((c) => (
                      <Chip
                        key={c.id}
                        label={c.name}
                        selected={field.value === c.id}
                        onPress={() => field.onChange(c.id)}
                      />
                    ))}
                  </View>
                  {fieldState.error ? (
                    <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
                      {errorText(fieldState.error.message)}
                    </Text>
                  ) : null}
                </View>
              )}
            />
          )}
        </QueryView>
        <Controller
          control={control}
          name="title"
          render={({ field, fieldState }) => (
            <TextField
              label={t('ask.title')}
              hint={t('ask.titleHint')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              maxLength={TITLE_MAX}
              error={errorText(fieldState.error?.message)}
            />
          )}
        />
        <Controller
          control={control}
          name="body"
          render={({ field, fieldState }) => (
            <TextField
              label={t('ask.body')}
              hint={t('ask.bodyHint')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              multiline
              maxLength={THREAD_BODY_MAX}
              error={errorText(fieldState.error?.message)}
            />
          )}
        />
        {ask.generalError ? <Notice tone="danger" message={ask.generalError} /> : null}
        <Button
          label={t('ask.publish')}
          icon="send"
          onPress={() => void ask.submit()}
          loading={ask.isSubmitting}
          disabled={ask.isSubmitting}
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  filters: { gap: spacing.sm },
  bleed: { flexGrow: 0, marginHorizontal: -spacing.gutter },
  chips: { paddingHorizontal: spacing.gutter, gap: spacing.xs },
  list: { flex: 1, marginHorizontal: -spacing.gutter, marginBottom: -spacing.lg },
  item: { paddingHorizontal: spacing.gutter },
  fab: { position: 'absolute', right: 0, bottom: spacing.xxxl * 2 },
  thread: { gap: spacing.md, padding: spacing.gutter },
  repliesHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  question: { overflow: 'hidden' },
  questionBand: { padding: spacing.md, paddingTop: spacing.xs, gap: spacing.xs },
  questionBody: { padding: spacing.md, gap: spacing.sm },
  topicTag: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, flexShrink: 1 },
  iconButton: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
  closed: { padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  form: { gap: spacing.lg },
  field: { gap: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
