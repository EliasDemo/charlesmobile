import { router, useLocalSearchParams } from 'expo-router';
import { ApplicantsScreen } from '@/features/jobs';

export default function ApplicantsRoute() {
  const { shopId, jobId } = useLocalSearchParams<{ shopId: string; jobId: string }>();
  return (
    <ApplicantsScreen
      shopId={shopId}
      jobId={jobId}
      onOpenProfile={(id) => router.push({ pathname: '/barber/[id]', params: { id } })}
      onHired={() => router.push({ pathname: '/shop/[shopId]/barbers', params: { shopId } })}
    />
  );
}
