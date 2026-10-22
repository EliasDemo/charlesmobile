import { router, useLocalSearchParams } from 'expo-router';
import { BookScreen } from '@/features/booking';
import { paramString } from '@/shared/lib';

export default function BookRoute() {
  const params = useLocalSearchParams<{ barbershopId: string; serviceId?: string; barberId?: string }>();
  return (
    <BookScreen
      barbershopId={params.barbershopId}
      serviceId={paramString(params.serviceId)}
      barberId={paramString(params.barberId)}
      onContinue={() => router.push('/book/summary')}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onOpenBarbershop={(id) => router.push({ pathname: '/barbershop/[id]', params: { id } })}
      onOpenBarberProfile={(id) => router.push({ pathname: '/barber/[id]', params: { id } })}
    />
  );
}
