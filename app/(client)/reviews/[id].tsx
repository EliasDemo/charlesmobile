import { router, useLocalSearchParams } from 'expo-router';
import { EditReviewScreen } from '@/features/reviews';

export default function EditReviewRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditReviewScreen reviewId={id} onDone={() => router.back()} />;
}
