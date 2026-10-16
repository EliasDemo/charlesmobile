import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { isApiError, nextPageParam, useSession } from '@/shared/api';
import { i18n } from '@/shared/i18n';
import { showToast, translateErrorMessage } from '@/shared/ui';
import {
  fetchConversations,
  fetchMessages,
  fetchUnreadConversations,
  messageKeys,
  reportMessage,
  sendMessage,
  setBlocked,
  startWithBarber,
  startWithBarbershop,
  type ConversationPage,
  type Mailbox,
  type MessagePage,
  type ReportReason,
} from '../api/messagingApi';

/** Body limit published in the contract (SendMessageDto). */
export const MESSAGE_MAX = 2000;

/** The badge also refreshes when the app comes back to the foreground (react-query focus). */
const UNREAD_REFRESH_MS = 60_000;

/** Conversations with unread messages, for the tab badge. Only with a session. */
export function useUnreadMessages() {
  const authenticated = useSession((s) => s.status === 'authenticated');
  const query = useQuery({
    queryKey: messageKeys.unread,
    queryFn: fetchUnreadConversations,
    enabled: authenticated,
    refetchInterval: UNREAD_REFRESH_MS,
  });
  return authenticated ? (query.data ?? 0) : 0;
}

export function useConversations(mailbox: Mailbox) {
  const query = useInfiniteQuery({
    queryKey: messageKeys.conversations(mailbox),
    queryFn: ({ pageParam }) => fetchConversations(mailbox, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: ConversationPage) => nextPageParam(last),
    staleTime: 0,
  });
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

/**
 * One chat: messages newest first (older ones load when scrolling up), sending, blocking and
 * reporting. Reading the first page marks it as read, so the badge is refreshed after it.
 */
export function useChat(mailbox: Mailbox, conversationId: string) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const key = messageKeys.chat(mailbox, conversationId);

  const query = useInfiniteQuery({
    queryKey: key,
    queryFn: async ({ pageParam }) => {
      const result = await fetchMessages(mailbox, conversationId, pageParam);
      if (!pageParam) {
        void queryClient.invalidateQueries({ queryKey: messageKeys.unread });
        void queryClient.invalidateQueries({ queryKey: messageKeys.conversations(mailbox) });
      }
      return result;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: MessagePage) => nextPageParam(last),
    staleTime: 0,
  });
  const conversation = query.data?.pages[0]?.conversation;
  const refresh = () => void queryClient.invalidateQueries({ queryKey: key });

  const send = useMutation({
    mutationFn: (body: string) => sendMessage(mailbox, conversationId, body),
    onSuccess: () => {
      setDraft('');
      refresh();
      void queryClient.invalidateQueries({ queryKey: messageKeys.conversations(mailbox) });
    },
    onError: (err) => {
      if (isApiError(err) && err.code === 'CONVERSATION_BLOCKED') refresh();
      setError(
        isApiError(err) && err.code === 'TOO_MANY_REQUESTS'
          ? i18n.t('messages:chat.slowDown')
          : translateErrorMessage(err),
      );
    },
  });
  const block = useMutation({
    mutationFn: (blocked: boolean) => setBlocked(mailbox, conversationId, blocked),
    onSuccess: (_result, blocked) => {
      refresh();
      void queryClient.invalidateQueries({ queryKey: messageKeys.conversations(mailbox) });
      showToast(i18n.t(blocked ? 'messages:chat.blockedDone' : 'messages:chat.unblockedDone'));
    },
    onError: (err) => setError(translateErrorMessage(err)),
  });
  const report = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: ReportReason }) => reportMessage(id, reason),
    onSuccess: () => showToast(i18n.t('messages:report.sent')),
    onError: (err) =>
      setError(
        isApiError(err) && err.code === 'ALREADY_REPORTED'
          ? i18n.t('messages:report.already')
          : translateErrorMessage(err),
      ),
  });

  const trimmed = draft.trim();
  return {
    query,
    messages: query.data?.pages.flatMap((p) => p.items),
    conversation,
    draft,
    setDraft: (value: string) => {
      setDraft(value);
      setError(null);
    },
    canSend: trimmed.length > 0 && trimmed.length <= MESSAGE_MAX && !conversation?.blocked,
    send: () => {
      if (!trimmed || send.isPending) return;
      setError(null);
      send.mutate(trimmed);
    },
    isSending: send.isPending,
    /** Only who blocked can unblock. */
    toggleBlock: () => conversation && block.mutate(!conversation.blocked),
    isBlocking: block.isPending,
    report: (id: string, reason: ReportReason) => report.mutate({ id, reason }),
    error,
  };
}

/** First message to a barbershop (a person) or to a barber (a barbershop). Leads to the chat. */
export function useStartConversation({
  target,
  onStarted,
}: {
  target:
    | { kind: 'barbershop'; barbershopId: string; professional?: boolean }
    | { kind: 'barber'; shopId: string; barberProfileId: string };
  onStarted: (conversationId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (text: string) =>
      target.kind === 'barbershop'
        ? startWithBarbershop(target.barbershopId, text, target.professional ? 'PROFESSIONAL' : 'CLIENT')
        : startWithBarber(target.shopId, target.barberProfileId, text),
    onSuccess: (page) => {
      void queryClient.invalidateQueries({ queryKey: messageKeys.all });
      onStarted(page.conversation.id);
    },
    onError: (err) => setError(translateErrorMessage(err)),
  });
  const trimmed = body.trim();
  return {
    body,
    setBody: (value: string) => {
      setBody(value);
      setError(null);
    },
    canSend: trimmed.length > 0 && trimmed.length <= MESSAGE_MAX,
    send: () => trimmed && mutation.mutate(trimmed),
    isSending: mutation.isPending,
    error,
  };
}
