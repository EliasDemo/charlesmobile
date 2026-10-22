import { router, useLocalSearchParams } from 'expo-router';
import { ClientsScreen } from '@/features/business';

export default function ClientsRoute() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return (
    <ClientsScreen
      shopId={shopId}
      onOpen={(clientId) =>
        router.push({ pathname: '/shop/[shopId]/clients/[clientId]', params: { shopId, clientId } })
      }
    />
  );
}
