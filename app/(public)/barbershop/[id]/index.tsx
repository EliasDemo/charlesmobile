import { router, useLocalSearchParams } from 'expo-router';
import { BarbershopScreen } from '@/features/barbershop';
import { ReportBarbershopButton } from '@/features/support';
import { useSession } from '@/shared/api';

export default function BarbershopRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const authenticated = useSession((s) => s.status === 'authenticated');
  return (
    <BarbershopScreen
      id={id}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onOpenService={(serviceId) =>
        router.push({ pathname: '/barbershop/[id]/service/[serviceId]', params: { id, serviceId } })
      }
      onOpenReviews={() => router.push({ pathname: '/barbershop/[id]/reviews', params: { id } })}
      onBook={() => router.push({ pathname: '/book/[barbershopId]', params: { barbershopId: id } })}
      onOpenGallery={() => router.push({ pathname: '/barbershop/[id]/gallery', params: { id } })}
      onBookStyle={(serviceId, barberId) =>
        router.push({
          pathname: '/book/[barbershopId]',
          params: { barbershopId: id, serviceId, ...(barberId ? { barberId } : {}) },
        })
      }
      footer={authenticated ? <ReportBarbershopButton barbershopId={id} /> : null}
      onRequireLogin={() => router.push({ pathname: '/login', params: { returnTo: `/barbershop/${id}` } })}
    />
  );
}
