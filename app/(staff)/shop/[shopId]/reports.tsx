import { useLocalSearchParams } from 'expo-router';
import { ReportsScreen } from '@/features/business';

export default function Route() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return <ReportsScreen shopId={shopId} />;
}
