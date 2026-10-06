import { useLocalSearchParams } from 'expo-router';
import { ReviewsScreen } from '@/features/barbershop';

export default function ReviewsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ReviewsScreen barbershopId={id} />;
}
