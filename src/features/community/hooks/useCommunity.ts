import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Share } from 'react-native';
import { isApiError, nextPageParam, useSession } from '@/shared/api';
import { i18n } from '@/shared/i18n';
import { haptic, photoForm, type PickedPhoto } from '@/shared/lib';
import { showToast, translateErrorMessage } from '@/shared/ui';
import {
  blockUser,
  communityKeys,
  countShare,
  createComment,
  createPost,
  deleteComment,
  deletePost,
  fetchAuthorPosts,
  fetchComments,
  fetchFeed,
  fetchFollow,
  fetchPost,
  fetchSavedPosts,
  likeComment,
  likePost,
  pinComment,
  pinPost,
  reportContent,
  savePost,
  setAttendance,
  setFollow,
  uploadPostMedia,
  type AttendanceStatus,
  type AuthorRef,
  type Comment,
  type CommentPage,
  type CreatePostBody,
  type FeedFilters,
  type Post,
  type PostPage,
  type ReportReason,
  type ReportTarget,
} from '../api/communityApi';

/** The contract: up to 10 photos per post, 2000 characters, comments up to 1000. */
export const MEDIA_MAX = 10;
export const BODY_MAX = 2000;
export const COMMENT_MAX = 1000;
export const REPORT_REASONS: ReportReason[] = [
  'SPAM',
  'OFFENSIVE',
  'HARASSMENT',
  'NUDITY',
  'VIOLENCE',
  'FALSE_INFO',
  'OTHER',
];

function pages<P extends { items: unknown[]; nextCursor: string | null }>(
  key: readonly unknown[],
  fetchPage: (cursor?: string) => Promise<P>,
  enabled = true,
) {
  return {
    queryKey: key,
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => fetchPage(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: P) => nextPageParam(last),
    enabled,
  };
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

/** The feed of a tab ("Cerca" needs the location the person chose to share). */
export function useFeed(filters: FeedFilters) {
  const enabled = filters.tab !== 'nearby' || Boolean(filters.near);
  return listOf<Post>(
    useInfiniteQuery(pages<PostPage>(communityKeys.feed(filters), (c) => fetchFeed(filters, c), enabled)),
  );
}

export function useSavedPosts() {
  return listOf<Post>(useInfiniteQuery(pages<PostPage>(communityKeys.saved, (c) => fetchSavedPosts(c))));
}

export function useAuthorPosts(author: AuthorRef) {
  return listOf<Post>(
    useInfiniteQuery(pages<PostPage>(communityKeys.authorPosts(author), (c) => fetchAuthorPosts(author, c))),
  );
}

/** One post; 410 POST_HIDDEN means it was removed or hidden by reports. */
export function usePost(postId: string) {
  const query = useQuery({
    queryKey: communityKeys.post(postId),
    queryFn: () => fetchPost(postId),
    retry: false,
  });
  const hidden = isApiError(query.error) && query.error.code === 'POST_HIDDEN';
  return { query, hidden };
}

/**
 * What a person does on a post: like, save, share, go to an event, report, delete or pin. Likes and
 * saves change at once and go back if the backend refuses.
 */
export function usePostActions(post: Post, { onDeleted }: { onDeleted?: () => void } = {}) {
  const queryClient = useQueryClient();
  const authenticated = useSession((s) => s.status === 'authenticated');
  const [liked, setLiked] = useState(post.likedByMe);
  const [likes, setLikes] = useState(post.counts.likes);
  const [saved, setSaved] = useState(post.savedByMe);
  const [attendance, setAttendanceState] = useState<AttendanceStatus>(post.myEventStatus);
  const [event, setEvent] = useState(post.event);
  // A fresh copy from the server replaces the local state (adjusted while rendering, not in an effect).
  const [synced, setSynced] = useState(post);
  if (synced !== post) {
    setSynced(post);
    setLiked(post.likedByMe);
    setLikes(post.counts.likes);
    setSaved(post.savedByMe);
    setAttendanceState(post.myEventStatus);
    setEvent(post.event);
  }
  const fail = (err: unknown) => showToast(translateErrorMessage(err));
  const refresh = () => void queryClient.invalidateQueries({ queryKey: communityKeys.all });

  const toggleLike = async () => {
    const on = !liked;
    setLiked(on);
    setLikes((n) => Math.max(0, n + (on ? 1 : -1)));
    if (on) haptic('light');
    try {
      await likePost(post.id, on);
    } catch (err) {
      setLiked(!on);
      setLikes((n) => Math.max(0, n + (on ? -1 : 1)));
      fail(err);
    }
  };
  const toggleSave = async () => {
    const on = !saved;
    setSaved(on);
    try {
      await savePost(post.id, on);
      showToast(i18n.t(on ? 'community:saved' : 'community:unsaved'));
      void queryClient.invalidateQueries({ queryKey: communityKeys.saved });
    } catch (err) {
      setSaved(!on);
      fail(err);
    }
  };
  const share = async () => {
    const result = await Share.share({
      message: `${post.body.slice(0, 120)}\n${post.shareUrl}`,
      url: post.shareUrl,
    });
    if (result.action === Share.sharedAction) void countShare(post.id).catch(() => undefined);
  };
  const attend = useMutation({
    mutationFn: (status: AttendanceStatus) => setAttendance(post.id, status),
    onSuccess: (state, status) => {
      setAttendanceState(status);
      if (event) setEvent({ ...event, going: state.going, interested: state.interested });
    },
    onError: (err) =>
      showToast(
        isApiError(err) && err.code === 'EVENT_FULL'
          ? i18n.t('community:event.full')
          : translateErrorMessage(err),
      ),
  });
  const remove = useMutation({
    mutationFn: () => deletePost(post.id),
    onSuccess: () => {
      refresh();
      showToast(i18n.t('community:deleted'));
      onDeleted?.();
    },
    onError: fail,
  });
  const pin = useMutation({
    mutationFn: () => pinPost(post.id, !post.pinned),
    onSuccess: refresh,
    onError: fail,
  });
  return {
    authenticated,
    liked,
    likes,
    saved,
    attendance,
    event,
    toggleLike: () => void toggleLike(),
    toggleSave: () => void toggleSave(),
    share: () => void share(),
    attend: (status: AttendanceStatus) => attend.mutate(status === attendance ? 'NONE' : status),
    isAttending: attend.isPending,
    remove: () => remove.mutate(),
    isRemoving: remove.isPending,
    togglePin: () => pin.mutate(),
  };
}

/** Report (post, comment or account) and block: required by the stores. */
export function useModeration() {
  const queryClient = useQueryClient();
  const report = useMutation({
    mutationFn: (v: { target: ReportTarget; id: string; reason: ReportReason; note?: string }) =>
      reportContent(v.target, v.id, v.reason, v.note),
    onSuccess: () => showToast(i18n.t('community:report.sent')),
    onError: (err) => showToast(translateErrorMessage(err)),
  });
  const block = useMutation({
    mutationFn: blockUser,
    onSuccess: () => {
      showToast(i18n.t('community:block.done'));
      void queryClient.invalidateQueries({ queryKey: communityKeys.all });
    },
    onError: (err) => showToast(translateErrorMessage(err)),
  });
  return {
    report: (target: ReportTarget, id: string, reason: ReportReason, note?: string) =>
      report.mutate({ target, id, reason, note }),
    block: (userId: string) => block.mutate(userId),
    isReporting: report.isPending,
  };
}

/**
 * Comments of a post (top level, pinned first) and of one thread. Replying to a reply keeps the
 * same parent and mentions the person (two levels at most).
 */
export function useComments(postId: string, parentId: string | null = null) {
  return listOf<Comment>(
    useInfiniteQuery(
      pages<CommentPage>(communityKeys.comments(postId, parentId), (c) => fetchComments(postId, parentId, c)),
    ),
  );
}

export function useCommentComposer(postId: string) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const send = useMutation({
    mutationFn: () => {
      const parentId = replyTo ? (replyTo.parentId ?? replyTo.id) : undefined;
      const mentionUserId = replyTo && replyTo.parentId ? replyTo.author.userId : undefined;
      return createComment(postId, {
        body: text.trim(),
        ...(parentId ? { parentId } : {}),
        ...(mentionUserId ? { mentionUserId } : {}),
      });
    },
    onSuccess: () => {
      setText('');
      setReplyTo(null);
      void queryClient.invalidateQueries({ queryKey: ['community', 'comments', postId] });
      void queryClient.invalidateQueries({ queryKey: communityKeys.post(postId) });
    },
    onError: (err) =>
      setError(
        isApiError(err) && err.code === 'COMMENTS_DISABLED'
          ? i18n.t('community:comments.disabled')
          : isApiError(err) && err.code === 'CONTENT_NOT_ALLOWED'
            ? i18n.t('community:contentNotAllowed')
            : translateErrorMessage(err),
      ),
  });
  return {
    text,
    setText,
    replyTo,
    setReplyTo,
    error,
    canSend: text.trim().length > 0 && text.length <= COMMENT_MAX && !send.isPending,
    send: () => {
      setError(null);
      send.mutate();
    },
    isSending: send.isPending,
  };
}

/** Like, pin or delete one comment (the backend says what is allowed). */
export function useCommentActions(comment: Comment) {
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(comment.likedByMe);
  const [likes, setLikes] = useState(comment.likes);
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: ['community', 'comments', comment.postId] });
  const toggleLike = async () => {
    const on = !liked;
    setLiked(on);
    setLikes((n) => Math.max(0, n + (on ? 1 : -1)));
    try {
      await likeComment(comment.id, on);
    } catch (err) {
      setLiked(!on);
      setLikes((n) => Math.max(0, n + (on ? -1 : 1)));
      showToast(translateErrorMessage(err));
    }
  };
  const remove = useMutation({ mutationFn: () => deleteComment(comment.id), onSuccess: refresh });
  const pin = useMutation({ mutationFn: () => pinComment(comment.id, !comment.pinned), onSuccess: refresh });
  return {
    liked,
    likes,
    toggleLike: () => void toggleLike(),
    remove: () => remove.mutate(),
    togglePin: () => pin.mutate(),
  };
}

/** Who can publish: the barbershops the account runs and its professional profile. */
export type PublishAs =
  { kind: 'BARBERSHOP'; id: string; name: string } | { kind: 'PROFESSIONAL'; name: string };

/** "Publicar": photos uploaded one by one (in order), then the post. */
export function useNewPost({ onPublished }: { onPublished: (post: Post) => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const publish = useMutation({
    mutationFn: async ({ body, photos }: { body: CreatePostBody; photos: PickedPhoto[] }) => {
      const mediaIds: string[] = [];
      setProgress({ done: 0, total: photos.length });
      for (const photo of photos) {
        const media = await uploadPostMedia(photoForm(photo));
        mediaIds.push(media.id);
        setProgress({ done: mediaIds.length, total: photos.length });
      }
      return createPost({ ...body, ...(mediaIds.length ? { mediaIds } : {}) });
    },
    onSuccess: (post) => {
      setProgress(null);
      void queryClient.invalidateQueries({ queryKey: communityKeys.all });
      showToast(i18n.t('community:new.published'));
      onPublished(post);
    },
    onError: (err) => {
      setProgress(null);
      setError(
        isApiError(err) && err.code === 'CONTENT_NOT_ALLOWED'
          ? i18n.t('community:contentNotAllowed')
          : isApiError(err) && err.status === 404
            ? i18n.t('community:new.needsProfile')
            : translateErrorMessage(err),
      );
    },
  });
  return {
    error,
    progress,
    isPublishing: publish.isPending,
    publish: (body: CreatePostBody, photos: PickedPhoto[]) => {
      setError(null);
      publish.mutate({ body, photos });
    },
  };
}

/** "Seguir" a barbershop or a professional profile (public count; following needs a session). */
export function useFollow(author: AuthorRef) {
  const queryClient = useQueryClient();
  const authenticated = useSession((s) => s.status === 'authenticated');
  const query = useQuery({ queryKey: communityKeys.follow(author), queryFn: () => fetchFollow(author) });
  const toggle = useMutation({
    mutationFn: () => setFollow(author, !(query.data?.following ?? false)),
    onSuccess: (state) => {
      queryClient.setQueryData(communityKeys.follow(author), state);
      void queryClient.invalidateQueries({ queryKey: ['community', 'feed'] });
    },
    onError: (err) => showToast(translateErrorMessage(err)),
  });
  return {
    authenticated,
    following: query.data?.following ?? false,
    followers: query.data?.followers ?? null,
    toggle: () => toggle.mutate(),
    isToggling: toggle.isPending,
  };
}
