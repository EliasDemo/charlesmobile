import { router, useLocalSearchParams } from 'expo-router';
import { ThreadScreen } from '@/features/forums';
import { useSession } from '@/shared/api';
import { askForAccount } from '@/shared/ui';

/** A forum thread (public to read; answering needs a session). */
export default function ThreadRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const authenticated = useSession((s) => s.status === 'authenticated');
  return (
    <ThreadScreen
      threadId={id}
      authenticated={authenticated}
      onRequireLogin={() => askForAccount('generic', `/forums/${id}`)}
      onDeleted={() => (router.canGoBack() ? router.back() : router.replace('/community'))}
    />
  );
}
