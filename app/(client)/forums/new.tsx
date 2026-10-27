import { router, useLocalSearchParams } from 'expo-router';
import { AskThreadScreen } from '@/features/forums';

/** "Preguntar": opens the new thread in place of the form. */
export default function AskRoute() {
  const { categoryId } = useLocalSearchParams<{ categoryId?: string }>();
  return (
    <AskThreadScreen
      categoryId={categoryId}
      onCreated={(id) => router.replace({ pathname: '/forums/[id]', params: { id } })}
    />
  );
}
