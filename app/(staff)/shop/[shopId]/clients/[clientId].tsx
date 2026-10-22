import { useLocalSearchParams } from 'expo-router';
import { ClientScreen } from '@/features/business';

export default function ClientRoute() {
  const { shopId, clientId } = useLocalSearchParams<{ shopId: string; clientId: string }>();
  return <ClientScreen shopId={shopId} clientId={clientId} />;
}
