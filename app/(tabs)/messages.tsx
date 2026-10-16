import { router } from 'expo-router';
import { ConversationsScreen, ME } from '@/features/messaging';
import { useEffectiveMode, useShopHome } from '@/features/shop-management';
import { SignInPrompt } from '@/features/auth';
import { useSession } from '@/shared/api';

/** The person's conversations; in barbershop mode, the selected barbershop's. */
export default function MessagesRoute() {
  const authenticated = useSession((s) => s.status === 'authenticated');
  const shopMode = useEffectiveMode() === 'shop';
  const { currentId } = useShopHome();
  if (!authenticated) {
    return (
      <SignInPrompt
        onLogin={() => router.push({ pathname: '/login', params: { returnTo: '/messages' } })}
        onRegister={() => router.push('/register')}
      />
    );
  }
  const mailbox = shopMode && currentId ? { kind: 'shop' as const, shopId: currentId } : ME;
  return (
    <ConversationsScreen
      key={mailbox.kind === 'me' ? 'me' : mailbox.shopId}
      mailbox={mailbox}
      onOpen={(conversation) =>
        router.push({
          pathname: '/messages/[id]',
          params: { id: conversation.id, ...(mailbox.kind === 'shop' ? { shopId: mailbox.shopId } : {}) },
        })
      }
    />
  );
}
