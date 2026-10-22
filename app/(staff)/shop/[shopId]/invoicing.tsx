import { useLocalSearchParams } from 'expo-router';
import { InvoicingScreen } from '@/features/business';

export default function Route() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return <InvoicingScreen shopId={shopId} />;
}
