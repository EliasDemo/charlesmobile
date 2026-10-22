import { router, useLocalSearchParams } from 'expo-router';
import { ChatScreen, ME } from '@/features/messaging';

/** `shopId` says the barbershop side; `resolve` (from a notice) lets the screen find the side. */
export default function ChatRoute() {
  const { id, shopId, resolve } = useLocalSearchParams<{ id: string; shopId?: string; resolve?: string }>();
  const mailbox = shopId ? { kind: 'shop' as const, shopId } : resolve ? undefined : ME;
  return (
    <ChatScreen
      conversationId={id}
      mailbox={mailbox}
      onOpenBarberProfile={(profileId) =>
        router.push({ pathname: '/barber/[id]', params: { id: profileId } })
      }
    />
  );
}
