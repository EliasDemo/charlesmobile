import { router, useLocalSearchParams } from 'expo-router';
import { JobFormScreen } from '@/features/jobs';

export default function EditJobRoute() {
  const { shopId, jobId } = useLocalSearchParams<{ shopId: string; jobId: string }>();
  return (
    <JobFormScreen
      shopId={shopId}
      jobId={jobId}
      onSaved={() => undefined}
      onApplicants={() =>
        router.push({ pathname: '/shop/[shopId]/jobs/[jobId]/applicants', params: { shopId, jobId } })
      }
    />
  );
}
