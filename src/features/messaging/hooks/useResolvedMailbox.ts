import { useQuery } from '@tanstack/react-query';
import { useShopHome } from '@/features/shop-management';
import { isApiError } from '@/shared/api';
import { fetchMessages, ME, type Mailbox } from '../api/messagingApi';

type Resolved = { status: 'loading' } | { status: 'notFound' } | { status: 'ready'; mailbox: Mailbox };

/**
 * A notice only carries the conversation id. It is the person's own, or one of a barbershop they
 * manage: try their own first, then each barbershop (the backend answers 404 for the others).
 */
export function useResolvedMailbox(conversationId: string, known?: Mailbox): Resolved {
  const { shops, mine } = useShopHome();
  const query = useQuery({
    queryKey: ['messages', 'resolve', conversationId],
    enabled: !known && !mine.isPending,
    queryFn: async (): Promise<Mailbox | null> => {
      const candidates: Mailbox[] = [ME, ...shops.map((s) => ({ kind: 'shop' as const, shopId: s.id }))];
      for (const mailbox of candidates) {
        try {
          await fetchMessages(mailbox, conversationId);
          return mailbox;
        } catch (error) {
          if (!(isApiError(error) && (error.status === 404 || error.status === 403))) throw error;
        }
      }
      return null;
    },
  });
  if (known) return { status: 'ready', mailbox: known };
  if (query.data) return { status: 'ready', mailbox: query.data };
  if (query.data === null || query.isError) return { status: 'notFound' };
  return { status: 'loading' };
}
