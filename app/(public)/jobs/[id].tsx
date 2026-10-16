import { router, useLocalSearchParams } from 'expo-router';
import { JobScreen } from '@/features/jobs';
import { useSession } from '@/shared/api';

export default function JobRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const authenticated = useSession((s) => s.status === 'authenticated');
  return (
    <JobScreen
      id={id}
      authenticated={authenticated}
      onRequireLogin={() => router.push({ pathname: '/login', params: { returnTo: `/jobs/${id}` } })}
      onRequireProfile={() => router.push('/career/edit')}
      onOpenShop={(barbershopId) =>
        router.push({ pathname: '/barbershop/[id]', params: { id: barbershopId } })
      }
    />
  );
}
