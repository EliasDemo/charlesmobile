import { router } from 'expo-router';
import { MyReviewsScreen } from '@/features/reviews';

export default function MyReviewsRoute() {
  return <MyReviewsScreen onEdit={(id) => router.push({ pathname: '/reviews/[id]', params: { id } })} />;
}
