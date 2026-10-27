import { useMemo } from 'react';
import { router } from 'expo-router';
import { askForAccount } from './AuthPrompt';

type Author = { kind: 'BARBERSHOP' | 'PROFESSIONAL'; id: string };

/** Where a community post leads: its detail, its author's profile and booking with the barbershop. */
export function useCommunityNavigation(returnTo: string) {
  return useMemo(
    () => ({
      onOpenPost: (postId: string) => router.push({ pathname: '/community/[id]', params: { id: postId } }),
      onOpenAuthor: (author: Author) =>
        author.kind === 'BARBERSHOP'
          ? router.push({ pathname: '/barbershop/[id]', params: { id: author.id } })
          : router.push({ pathname: '/barber/[id]', params: { id: author.id } }),
      onBook: (post: { author: Author }) =>
        router.push({ pathname: '/book/[barbershopId]', params: { barbershopId: post.author.id } }),
      onRequireLogin: () => askForAccount('generic', returnTo),
    }),
    [returnTo],
  );
}
