import { SavedPostsScreen } from '@/features/community';
import { useCommunityNavigation } from '@/shared/ui';

export default function SavedPostsRoute() {
  const nav = useCommunityNavigation('/community/saved');
  return <SavedPostsScreen nav={nav} />;
}
