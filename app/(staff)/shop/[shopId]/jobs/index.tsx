import { router, useLocalSearchParams } from 'expo-router';
import { ShopJobsScreen } from '@/features/jobs';

export default function ShopJobsRoute() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return (
    <ShopJobsScreen
      shopId={shopId}
      onNew={() => router.push({ pathname: '/shop/[shopId]/jobs/new', params: { shopId } })}
      onOpen={(jobId) => router.push({ pathname: '/shop/[shopId]/jobs/[jobId]', params: { shopId, jobId } })}
    />
  );
}
