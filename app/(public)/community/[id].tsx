import { router, useLocalSearchParams } from 'expo-router';
import { PostScreen } from '@/features/community';
import { useSession } from '@/shared/api';
import { useCommunityNavigation } from '@/shared/ui';

/** A post with its comments; public, interacting asks for an account. */
export default function PostRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const authenticated = useSession((s) => s.status === 'authenticated');
  const nav = useCommunityNavigation(`/community/${id}`);
  return (
    <PostScreen
      postId={id}
      nav={nav}
      authenticated={authenticated}
      onDeleted={() => (router.canGoBack() ? router.back() : router.replace('/community'))}
    />
  );
}
