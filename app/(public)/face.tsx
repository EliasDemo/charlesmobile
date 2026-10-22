import { router } from 'expo-router';
import { FaceScreen } from '@/features/face';

export default function FaceRoute() {
  return (
    <FaceScreen
      onBook={({ barbershopId, serviceId, barberId }) =>
        router.push({
          pathname: '/book/[barbershopId]',
          params: { barbershopId, ...(serviceId ? { serviceId } : {}), ...(barberId ? { barberId } : {}) },
        })
      }
      onOpenBarber={(id) => router.push({ pathname: '/barber/[id]', params: { id } })}
    />
  );
}
