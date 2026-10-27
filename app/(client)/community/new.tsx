import { useMemo } from 'react';
import { router } from 'expo-router';
import { NewPostScreen, type PublishAs } from '@/features/community';
import { useMyCareerProfile } from '@/features/career';
import { useShopHome } from '@/features/shop-management';

/** "Nueva publicación": as one of the barbershops the account runs, or as its professional profile. */
export default function NewPostRoute() {
  const { shops } = useShopHome();
  const career = useMyCareerProfile();
  const authors = useMemo<PublishAs[]>(
    () => [
      ...shops.map((s) => ({ kind: 'BARBERSHOP' as const, id: s.id, name: s.name })),
      ...(career.data ? [{ kind: 'PROFESSIONAL' as const, name: career.data.displayName }] : []),
    ],
    [shops, career.data],
  );
  return (
    <NewPostScreen
      authors={authors}
      onPublished={(post) => router.replace({ pathname: '/community/[id]', params: { id: post.id } })}
      onCreateProfile={() => router.push('/career/edit')}
    />
  );
}
