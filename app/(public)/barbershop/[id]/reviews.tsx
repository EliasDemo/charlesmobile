import { useLocalSearchParams } from 'expo-router';
import { ReviewsScreen } from '@/features/barbershop';
import { ReportReviewButton } from '@/features/reviews';
import { useSession } from '@/shared/api';

export default function ReviewsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const authenticated = useSession((s) => s.status === 'authenticated');
  return (
    <ReviewsScreen
      barbershopId={id}
      reviewFooter={authenticated ? (reviewId) => <ReportReviewButton reviewId={reviewId} /> : undefined}
    />
  );
}
