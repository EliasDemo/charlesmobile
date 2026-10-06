import { router, useLocalSearchParams } from 'expo-router';
import { BarbershopScreen } from '@/features/barbershop';

export default function BarbershopRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <BarbershopScreen
      id={id}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onOpenService={(serviceId) =>
        router.push({ pathname: '/barbershop/[id]/service/[serviceId]', params: { id, serviceId } })
      }
      onOpenReviews={() => router.push({ pathname: '/barbershop/[id]/reviews', params: { id } })}
      onRequireLogin={() => router.push({ pathname: '/login', params: { returnTo: `/barbershop/${id}` } })}
    />
  );
}
