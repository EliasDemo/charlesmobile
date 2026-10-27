import { api, unwrap, type components } from '@/shared/api';

type S = components['schemas'];
export type ForumCategory = S['ForumCategoryDto'];
export type ThreadSummary = S['ThreadSummaryDto'];
export type ThreadPage = S['ThreadPageDto'];
export type Thread = S['ThreadDto'];
export type Reply = S['ReplyDto'];
export type ReplyPage = S['ReplyPageDto'];
export type ThreadSort = 'recent' | 'new' | 'unanswered';
export type ReplySort = 'oldest' | 'helpful';
export type ThreadFilters = { categoryId?: string; q?: string; sort: ThreadSort };

export const forumKeys = {
  all: ['forums'] as const,
  categories: ['forums', 'categories'] as const,
  threads: (f: ThreadFilters) => ['forums', 'threads', f] as const,
  thread: (id: string) => ['forums', 'thread', id] as const,
  replies: (threadId: string, sort: ReplySort) => ['forums', 'replies', threadId, sort] as const,
};

const PAGE = 20;
const id = (value: string) => ({ params: { path: { id: value } } });

export const fetchCategories = (): Promise<ForumCategory[]> => unwrap(api.GET('/api/v1/forums/categories'));

/** Public. `recent` puts pinned threads first. */
export const fetchThreads = (f: ThreadFilters, cursor?: string): Promise<ThreadPage> =>
  unwrap(
    api.GET('/api/v1/forums/threads', {
      params: {
        query: {
          limit: PAGE,
          sort: f.sort,
          ...(f.categoryId ? { categoryId: f.categoryId } : {}),
          ...(f.q ? { q: f.q } : {}),
          ...(cursor ? { cursor } : {}),
        },
      },
    }),
  );

/** 410 THREAD_HIDDEN when it was removed or is under review. */
export const fetchThread = (threadId: string): Promise<Thread> =>
  unwrap(api.GET('/api/v1/forums/threads/{id}', id(threadId)));
export const createThread = (body: S['CreateThreadDto']): Promise<Thread> =>
  unwrap(api.POST('/api/v1/forums/threads', { body }));
export const updateThread = (threadId: string, body: S['UpdateThreadDto']): Promise<Thread> =>
  unwrap(api.PATCH('/api/v1/forums/threads/{id}', { ...id(threadId), body }));
export const deleteThread = (threadId: string) =>
  unwrap(api.DELETE('/api/v1/forums/threads/{id}', id(threadId)));

/** The best answer always comes first, then by `sort`. */
export const fetchReplies = (threadId: string, sort: ReplySort, cursor?: string): Promise<ReplyPage> =>
  unwrap(
    api.GET('/api/v1/forums/threads/{id}/replies', {
      params: { path: { id: threadId }, query: { limit: PAGE, sort, ...(cursor ? { cursor } : {}) } },
    }),
  );
/** 409 THREAD_LOCKED when support closed the thread. */
export const createReply = (threadId: string, body: string): Promise<Reply> =>
  unwrap(api.POST('/api/v1/forums/threads/{id}/replies', { ...id(threadId), body: { body } }));
export const updateReply = (replyId: string, body: string): Promise<Reply> =>
  unwrap(api.PATCH('/api/v1/forums/replies/{id}', { ...id(replyId), body: { body } }));
export const deleteReply = (replyId: string) =>
  unwrap(api.DELETE('/api/v1/forums/replies/{id}', id(replyId)));

/** "Me sirvió" (idempotent; 403 on one's own reply). */
export const setHelpful = (replyId: string, on: boolean) =>
  unwrap(
    on
      ? api.PUT('/api/v1/forums/replies/{id}/helpful', id(replyId))
      : api.DELETE('/api/v1/forums/replies/{id}/helpful', id(replyId)),
  );

/** Only the thread's author: marks (or clears) the best answer. */
export const setSolution = (threadId: string, replyId: string | null) =>
  unwrap(
    replyId
      ? api.PUT('/api/v1/forums/threads/{id}/solution', { ...id(threadId), body: { replyId } })
      : api.DELETE('/api/v1/forums/threads/{id}/solution', id(threadId)),
  );
