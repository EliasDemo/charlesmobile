import { router, useLocalSearchParams } from 'expo-router';
import { NewReviewScreen } from '@/features/reviews';

export default function NewReviewRoute() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  return <NewReviewScreen bookingId={bookingId} onDone={() => router.back()} />;
}
