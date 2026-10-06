import { router, useLocalSearchParams } from 'expo-router';
import { ServiceScreen } from '@/features/barbershop';

export default function ServiceRoute() {
  const { id, serviceId } = useLocalSearchParams<{ id: string; serviceId: string }>();
  return (
    <ServiceScreen
      barbershopId={id}
      serviceId={serviceId}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onBook={() =>
        router.push({ pathname: '/book/[barbershopId]', params: { barbershopId: id, serviceId } })
      }
      onOpenBarbershop={(other) => router.push({ pathname: '/barbershop/[id]', params: { id: other } })}
    />
  );
}
