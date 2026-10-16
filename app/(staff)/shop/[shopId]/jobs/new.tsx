import { router, useLocalSearchParams } from 'expo-router';
import { JobFormScreen } from '@/features/jobs';

export default function NewJobRoute() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return (
    <JobFormScreen
      shopId={shopId}
      onSaved={(jobId) =>
        router.replace({ pathname: '/shop/[shopId]/jobs/[jobId]', params: { shopId, jobId } })
      }
    />
  );
}
