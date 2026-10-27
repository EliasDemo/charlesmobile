import { api, unwrap, type components } from '@/shared/api';

type S = components['schemas'];
export type Post = S['PostDto'];
export type PostPage = S['PostPageDto'];
export type PostType = Post['type'];
export type PostMedia = S['PostMediaDto'];
export type Comment = S['CommentDto'];
export type CommentPage = S['CommentPageDto'];
export type CreatePostBody = S['CreatePostDto'];
export type EventInput = S['PostEventInputDto'];
export type AttendanceStatus = Post['myEventStatus'];
export type ReportReason = S['CreateContentReportDto']['reason'];
export type ReportTarget = S['CreateContentReportDto']['targetType'];
export type FeedTab = 'forYou' | 'nearby' | 'following';
export type FeedFilters = {
  tab: FeedTab;
  type?: PostType;
  near?: { latitude: number; longitude: number };
};
export type AuthorRef = { kind: 'BARBERSHOP' | 'PROFESSIONAL'; id: string };

export const communityKeys = {
  all: ['community'] as const,
  feed: (f: FeedFilters) => ['community', 'feed', f] as const,
  post: (id: string) => ['community', 'post', id] as const,
  comments: (postId: string, parentId: string | null) =>
    ['community', 'comments', postId, parentId ?? 'top'] as const,
  saved: ['community', 'saved'] as const,
  authorPosts: (a: AuthorRef) => ['community', 'author', a.kind, a.id] as const,
  follow: (a: AuthorRef) => ['community', 'follow', a.kind, a.id] as const,
};

const PAGE = 15;
const multipart = { bodySerializer: (body: unknown) => body as FormData };
const id = (value: string) => ({ params: { path: { id: value } } });

/** Public: works without a session ("following" is then empty). */
export const fetchFeed = (f: FeedFilters, cursor?: string): Promise<PostPage> =>
  unwrap(
    api.GET('/api/v1/feed', {
      params: {
        query: {
          limit: PAGE,
          tab: f.tab,
          ...(cursor ? { cursor } : {}),
          ...(f.type ? { type: f.type } : {}),
          ...(f.tab === 'nearby' && f.near ? { lat: f.near.latitude, lng: f.near.longitude } : {}),
        },
      },
    }),
  );

export const fetchPost = (postId: string): Promise<Post> => unwrap(api.GET('/api/v1/posts/{id}', id(postId)));
export const deletePost = (postId: string) => unwrap(api.DELETE('/api/v1/posts/{id}', id(postId)));
export const pinPost = (postId: string, pinned: boolean) =>
  unwrap(api.PUT('/api/v1/posts/{id}/pin', { ...id(postId), body: { pinned } }));

/** Photos go first, one per call; the post then lists their ids in order. */
export const uploadPostMedia = (form: FormData): Promise<PostMedia> =>
  unwrap(api.POST('/api/v1/posts/media', { body: form as never, ...multipart }));
export const createPost = (body: CreatePostBody): Promise<Post> =>
  unwrap(api.POST('/api/v1/posts', { body }));

export const likePost = (postId: string, on: boolean) =>
  unwrap(
    on ? api.PUT('/api/v1/posts/{id}/like', id(postId)) : api.DELETE('/api/v1/posts/{id}/like', id(postId)),
  );
export const savePost = (postId: string, on: boolean) =>
  unwrap(
    on ? api.PUT('/api/v1/posts/{id}/save', id(postId)) : api.DELETE('/api/v1/posts/{id}/save', id(postId)),
  );
/** Counts a share (no session needed). */
export const countShare = (postId: string) => unwrap(api.POST('/api/v1/posts/{id}/share', id(postId)));
export const setAttendance = (postId: string, status: AttendanceStatus) =>
  unwrap(api.PUT('/api/v1/posts/{id}/attendance', { ...id(postId), body: { status } }));

export const fetchComments = (
  postId: string,
  parentId: string | null,
  cursor?: string,
): Promise<CommentPage> =>
  unwrap(
    api.GET('/api/v1/posts/{id}/comments', {
      params: {
        path: { id: postId },
        query: { limit: 20, ...(parentId ? { parentId } : {}), ...(cursor ? { cursor } : {}) },
      },
    }),
  );
export const createComment = (
  postId: string,
  body: { body: string; parentId?: string; mentionUserId?: string },
): Promise<Comment> => unwrap(api.POST('/api/v1/posts/{id}/comments', { ...id(postId), body }));
export const deleteComment = (commentId: string) =>
  unwrap(api.DELETE('/api/v1/comments/{id}', id(commentId)));
export const likeComment = (commentId: string, on: boolean) =>
  unwrap(
    on
      ? api.PUT('/api/v1/comments/{id}/like', id(commentId))
      : api.DELETE('/api/v1/comments/{id}/like', id(commentId)),
  );
export const pinComment = (commentId: string, pinned: boolean) =>
  unwrap(api.PUT('/api/v1/comments/{id}/pin', { ...id(commentId), body: { pinned } }));

export const reportContent = (
  targetType: ReportTarget,
  targetId: string,
  reason: ReportReason,
  note?: string,
) =>
  unwrap(api.POST('/api/v1/reports', { body: { targetType, targetId, reason, ...(note ? { note } : {}) } }));
export const blockUser = (userId: string) => unwrap(api.PUT('/api/v1/users/{id}/block', id(userId)));

export const fetchSavedPosts = (cursor?: string): Promise<PostPage> =>
  unwrap(
    api.GET('/api/v1/me/saved-posts', { params: { query: { limit: PAGE, ...(cursor ? { cursor } : {}) } } }),
  );

export const fetchAuthorPosts = (a: AuthorRef, cursor?: string): Promise<PostPage> => {
  const query = { limit: PAGE, ...(cursor ? { cursor } : {}) };
  return unwrap(
    a.kind === 'BARBERSHOP'
      ? api.GET('/api/v1/barbershops/{id}/posts', { params: { path: { id: a.id }, query } })
      : api.GET('/api/v1/professional-profiles/{id}/posts', { params: { path: { id: a.id }, query } }),
  );
};

export const fetchFollow = (a: AuthorRef) =>
  unwrap(
    a.kind === 'BARBERSHOP'
      ? api.GET('/api/v1/barbershops/{id}/follow', id(a.id))
      : api.GET('/api/v1/professional-profiles/{id}/follow', id(a.id)),
  );
export const setFollow = (a: AuthorRef, on: boolean) =>
  unwrap(
    a.kind === 'BARBERSHOP'
      ? on
        ? api.PUT('/api/v1/barbershops/{id}/follow', id(a.id))
        : api.DELETE('/api/v1/barbershops/{id}/follow', id(a.id))
      : on
        ? api.PUT('/api/v1/professional-profiles/{id}/follow', id(a.id))
        : api.DELETE('/api/v1/professional-profiles/{id}/follow', id(a.id)),
  );
