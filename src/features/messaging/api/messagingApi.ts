import { api, unwrap, type components } from '@/shared/api';

type S = components['schemas'];
export type Conversation = S['ConversationDto'];
export type ConversationPage = S['ConversationPageDto'];
export type Message = S['MessageDto'];
export type MessagePage = S['MessagePageDto'];
export type ReportReason = S['ReportMessageDto']['reason'];

/**
 * Whose messages: the person's own (client or barber), or a barbershop's (its OWNER and MANAGER
 * answer for it). Same screens, different routes (CARRERA.md §2).
 */
export type Mailbox = { kind: 'me' } | { kind: 'shop'; shopId: string };

export const ME: Mailbox = { kind: 'me' };

const mailboxKey = (mailbox: Mailbox) => (mailbox.kind === 'me' ? 'me' : `shop:${mailbox.shopId}`);

export const messageKeys = {
  all: ['messages'] as const,
  unread: ['messages', 'unread'] as const,
  conversations: (mailbox: Mailbox) => ['messages', mailboxKey(mailbox), 'list'] as const,
  chat: (mailbox: Mailbox, id: string) => ['messages', mailboxKey(mailbox), 'chat', id] as const,
};

const PAGE = 20;
const page = (cursor?: string) => ({ limit: PAGE, ...(cursor ? { cursor } : {}) });

export const fetchConversations = (mailbox: Mailbox, cursor?: string): Promise<ConversationPage> =>
  mailbox.kind === 'me'
    ? unwrap(api.GET('/api/v1/me/conversations', { params: { query: page(cursor) } }))
    : unwrap(
        api.GET('/api/v1/barbershops/{barbershopId}/conversations', {
          params: { path: { barbershopId: mailbox.shopId }, query: page(cursor) },
        }),
      );

/** How many of the person's conversations have unread messages (the tab badge). */
export const fetchUnreadConversations = (): Promise<number> =>
  unwrap(api.GET('/api/v1/me/conversations/unread')).then((r) => r.conversations);

/** Newest first. The first page marks the conversation as read. */
export const fetchMessages = (mailbox: Mailbox, id: string, cursor?: string): Promise<MessagePage> =>
  mailbox.kind === 'me'
    ? unwrap(
        api.GET('/api/v1/me/conversations/{id}/messages', {
          params: { path: { id }, query: page(cursor) },
        }),
      )
    : unwrap(
        api.GET('/api/v1/barbershops/{barbershopId}/conversations/{id}/messages', {
          params: { path: { barbershopId: mailbox.shopId, id }, query: page(cursor) },
        }),
      );

export const sendMessage = (mailbox: Mailbox, id: string, body: string): Promise<Message> =>
  mailbox.kind === 'me'
    ? unwrap(api.POST('/api/v1/me/conversations/{id}/messages', { params: { path: { id } }, body: { body } }))
    : unwrap(
        api.POST('/api/v1/barbershops/{barbershopId}/conversations/{id}/messages', {
          params: { path: { barbershopId: mailbox.shopId, id } },
          body: { body },
        }),
      );

export const setBlocked = (mailbox: Mailbox, id: string, blocked: boolean): Promise<Conversation> => {
  if (mailbox.kind === 'me') {
    return blocked
      ? unwrap(api.POST('/api/v1/me/conversations/{id}/block', { params: { path: { id } } }))
      : unwrap(api.POST('/api/v1/me/conversations/{id}/unblock', { params: { path: { id } } }));
  }
  const path = { barbershopId: mailbox.shopId, id };
  return blocked
    ? unwrap(api.POST('/api/v1/barbershops/{barbershopId}/conversations/{id}/block', { params: { path } }))
    : unwrap(api.POST('/api/v1/barbershops/{barbershopId}/conversations/{id}/unblock', { params: { path } }));
};

export const reportMessage = (id: string, reason: ReportReason, details?: string) =>
  unwrap(
    api.POST('/api/v1/messages/{id}/report', {
      params: { path: { id } },
      body: { reason, ...(details ? { details } : {}) },
    }),
  );

/** A person writes to a barbershop (`PROFESSIONAL` when a barber writes about work). */
export const startWithBarbershop = (
  barbershopId: string,
  body: string,
  kind: 'CLIENT' | 'PROFESSIONAL' = 'CLIENT',
): Promise<MessagePage> =>
  unwrap(api.POST('/api/v1/me/conversations', { body: { barbershopId, body, kind } }));

/** A barbershop writes to a barber (never first to a client: there is no such action). */
export const startWithBarber = (
  shopId: string,
  barberProfileId: string,
  body: string,
): Promise<MessagePage> =>
  unwrap(
    api.POST('/api/v1/barbershops/{barbershopId}/conversations', {
      params: { path: { barbershopId: shopId } },
      body: { barberProfileId, body },
    }),
  );
