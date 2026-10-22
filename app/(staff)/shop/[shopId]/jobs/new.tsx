import { router, useLocalSearchParams } from 'expo-router';
import { JobWizardScreen } from '@/features/jobs';

export default function NewJobRoute() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return (
    <JobWizardScreen
      shopId={shopId}
      onSaved={(jobId) =>
        router.replace({ pathname: '/shop/[shopId]/jobs/[jobId]', params: { shopId, jobId } })
      }
    />
  );
}
