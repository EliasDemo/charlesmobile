import { router, useLocalSearchParams } from 'expo-router';
import { GalleryScreen } from '@/features/gallery';

export default function GalleryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <GalleryScreen
      barbershopId={id}
      onBookStyle={(serviceId, barberId) =>
        router.push({
          pathname: '/book/[barbershopId]',
          params: { barbershopId: id, serviceId, ...(barberId ? { barberId } : {}) },
        })
      }
    />
  );
}
