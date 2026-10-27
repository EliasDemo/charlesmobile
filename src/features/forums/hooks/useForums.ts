import { zodResolver } from '@hookform/resolvers/zod';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { isApiError, nextPageParam } from '@/shared/api';
import { i18n } from '@/shared/i18n';
import { haptic } from '@/shared/lib';
import { applyServerErrors, showToast, translateErrorMessage } from '@/shared/ui';
import {
  createReply,
  createThread,
  deleteReply,
  deleteThread,
  fetchCategories,
  fetchReplies,
  fetchThread,
  fetchThreads,
  forumKeys,
  setHelpful,
  setSolution,
  updateReply,
  updateThread,
  type Reply,
  type ReplyPage,
  type ReplySort,
  type Thread,
  type ThreadFilters,
  type ThreadPage,
  type ThreadSummary,
} from '../api/forumsApi';
import { REPLY_MAX, threadSchema, type ThreadForm } from '../schemas/forumSchemas';

/** The message for the errors these screens expect; the rest go through the shared translator. */
function forumError(err: unknown): string {
  if (isApiError(err) && err.code === 'CONTENT_NOT_ALLOWED') return i18n.t('forums:contentNotAllowed');
  if (isApiError(err) && err.code === 'THREAD_LOCKED') return i18n.t('forums:thread.lockedSend');
  if (isApiError(err) && err.code === 'THREAD_HIDDEN') return i18n.t('forums:hidden.title');
  return translateErrorMessage(err);
}

function listOf<T>(query: {
  data?: { pages: { items: T[] }[] };
  error: unknown;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isRefetching: boolean;
  fetchNextPage: () => unknown;
  refetch: () => unknown;
}) {
  return {
    items: query.data?.pages.flatMap((p) => p.items),
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isRefetching: query.isRefetching,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}

export function useForumCategories() {
  return useQuery({ queryKey: forumKeys.categories, queryFn: fetchCategories, staleTime: 300_000 });
}

export function useThreads(filters: ThreadFilters) {
  return listOf<ThreadSummary>(
    useInfiniteQuery({
      queryKey: forumKeys.threads(filters),
      queryFn: ({ pageParam }) => fetchThreads(filters, pageParam),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last: ThreadPage) => nextPageParam(last),
    }),
  );
}

/** One thread; 410 THREAD_HIDDEN means it was removed or is under review. */
export function useThread(threadId: string) {
  const query = useQuery({ queryKey: forumKeys.thread(threadId), queryFn: () => fetchThread(threadId) });
  const hidden = isApiError(query.error) && query.error.code === 'THREAD_HIDDEN';
  return { query, hidden };
}

export function useReplies(threadId: string, sort: ReplySort) {
  return listOf<Reply>(
    useInfiniteQuery({
      queryKey: forumKeys.replies(threadId, sort),
      queryFn: ({ pageParam }) => fetchReplies(threadId, sort, pageParam),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last: ReplyPage) => nextPageParam(last),
    }),
  );
}

/** Refreshes the thread, its replies and the lists (counts and ✓ change with every answer). */
function useRefreshThread(threadId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: forumKeys.thread(threadId) });
    void queryClient.invalidateQueries({ queryKey: ['forums', 'replies', threadId] });
    void queryClient.invalidateQueries({ queryKey: ['forums', 'threads'] });
  };
}

/** The answer box at the bottom of a thread. */
export function useReplyComposer(threadId: string) {
  const refresh = useRefreshThread(threadId);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const send = useMutation({
    mutationFn: () => createReply(threadId, text.trim()),
    onSuccess: () => {
      setText('');
      refresh();
    },
    onError: (err) => {
      setError(forumError(err));
      // Closed meanwhile: reload so the thread shows it is closed.
      if (isApiError(err) && err.code === 'THREAD_LOCKED') refresh();
    },
  });
  return {
    text,
    setText: (value: string) => {
      setText(value);
      setError(null);
    },
    error,
    canSend: text.trim().length > 0 && text.length <= REPLY_MAX && !send.isPending,
    isSending: send.isPending,
    send: () => {
      setError(null);
      send.mutate();
    },
  };
}

/**
 * "Me sirvió", "Marcar como la mejor", edit and delete for one reply. What is allowed comes from the
 * API (`isMine` of the reply and of the thread).
 */
export function useReplyActions(reply: Reply, thread: Pick<Thread, 'id' | 'isMine'>) {
  const refresh = useRefreshThread(thread.id);
  const [voted, setVoted] = useState(reply.votedHelpful);
  const [count, setCount] = useState(reply.helpful);
  // Follow the server's numbers when a refetch brings them (adjusting state during render).
  const [synced, setSynced] = useState(reply);
  if (synced !== reply) {
    setSynced(reply);
    setVoted(reply.votedHelpful);
    setCount(reply.helpful);
  }
  const helpful = useMutation({
    mutationFn: (on: boolean) => setHelpful(reply.id, on),
    onError: (err, on) => {
      setVoted(!on);
      setCount((c) => c + (on ? -1 : 1));
      showToast(forumError(err));
    },
  });
  const solution = useMutation({
    mutationFn: (on: boolean) => setSolution(thread.id, on ? reply.id : null),
    onSuccess: (_, on) => {
      if (on) haptic('success');
      showToast(i18n.t(on ? 'forums:reply.markedBest' : 'forums:reply.unmarkedBest'));
      refresh();
    },
    onError: (err) => showToast(forumError(err)),
  });
  const edit = useMutation({
    mutationFn: (body: string) => updateReply(reply.id, body.trim()),
    onSuccess: refresh,
    onError: (err) => showToast(forumError(err)),
  });
  const remove = useMutation({
    mutationFn: () => deleteReply(reply.id),
    onSuccess: () => {
      showToast(i18n.t('forums:reply.deleted'));
      refresh();
    },
    onError: (err) => showToast(forumError(err)),
  });
  return {
    voted,
    count,
    canVote: !reply.isMine,
    canMarkBest: thread.isMine,
    toggleHelpful: () => {
      // A tap while the previous one is still going would count twice.
      if (helpful.isPending) return;
      const on = !voted;
      setVoted(on);
      setCount((c) => c + (on ? 1 : -1));
      helpful.mutate(on);
    },
    setBest: (on: boolean) => solution.mutate(on),
    isMarking: solution.isPending,
    edit: (body: string, onDone: () => void) => edit.mutate(body, { onSuccess: onDone }),
    isEditing: edit.isPending,
    remove: () => remove.mutate(),
  };
}

/** Edit or delete one's own thread. */
export function useThreadActions(threadId: string, { onDeleted }: { onDeleted: () => void }) {
  const queryClient = useQueryClient();
  const refresh = useRefreshThread(threadId);
  const edit = useMutation({
    mutationFn: (body: { title: string; body: string }) =>
      updateThread(threadId, { title: body.title.trim(), body: body.body.trim() }),
    onSuccess: refresh,
    onError: (err) => showToast(forumError(err)),
  });
  const remove = useMutation({
    mutationFn: () => deleteThread(threadId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: forumKeys.all });
      showToast(i18n.t('forums:thread.deleted'));
      onDeleted();
    },
    onError: (err) => showToast(forumError(err)),
  });
  return {
    edit: (body: { title: string; body: string }, onDone: () => void) =>
      edit.mutate(body, { onSuccess: onDone }),
    isEditing: edit.isPending,
    remove: () => remove.mutate(),
    isRemoving: remove.isPending,
  };
}

/** "Preguntar": a topic, a title (8 to 140) and the question. */
export function useAskThread({
  categoryId,
  onCreated,
}: {
  categoryId?: string;
  onCreated: (thread: Thread) => void;
}) {
  const queryClient = useQueryClient();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm<ThreadForm>({
    resolver: zodResolver(threadSchema),
    mode: 'onTouched',
    defaultValues: { categoryId: categoryId ?? '', title: '', body: '' },
  });
  const create = useMutation({
    mutationFn: (values: ThreadForm) =>
      createThread({ categoryId: values.categoryId, title: values.title.trim(), body: values.body.trim() }),
    onSuccess: (thread) => {
      void queryClient.invalidateQueries({ queryKey: forumKeys.all });
      showToast(i18n.t('forums:ask.published'));
      onCreated(thread);
    },
    onError: (err) =>
      setGeneralError(
        isApiError(err) && err.code === 'CONTENT_NOT_ALLOWED'
          ? forumError(err)
          : applyServerErrors(err, form.setError, ['categoryId', 'title', 'body']),
      ),
  });
  return {
    form,
    generalError,
    isSubmitting: create.isPending,
    submit: form.handleSubmit((values) => {
      setGeneralError(null);
      create.mutate(values);
    }),
  };
}
