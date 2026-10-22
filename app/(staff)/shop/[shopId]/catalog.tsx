import { useLocalSearchParams } from 'expo-router';
import { CatalogScreen } from '@/features/business';

export default function Route() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return <CatalogScreen shopId={shopId} />;
}
