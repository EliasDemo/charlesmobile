import { router, useLocalSearchParams } from 'expo-router';
import { JobScreen } from '@/features/jobs';
import { useSession } from '@/shared/api';
import { askForAccount } from '@/shared/ui';

export default function JobRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const authenticated = useSession((s) => s.status === 'authenticated');
  return (
    <JobScreen
      id={id}
      authenticated={authenticated}
      onRequireLogin={() => askForAccount('apply', `/jobs/${id}`)}
      onRequireProfile={() => router.push('/career/edit')}
      onOpenShop={(barbershopId) =>
        router.push({ pathname: '/barbershop/[id]', params: { id: barbershopId } })
      }
    />
  );
}
