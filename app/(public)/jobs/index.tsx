import { router } from 'expo-router';
import { JobsScreen } from '@/features/jobs';
import { useSession } from '@/shared/api';

export default function JobsRoute() {
  const authenticated = useSession((s) => s.status === 'authenticated');
  return (
    <JobsScreen
      onOpen={(id) => router.push({ pathname: '/jobs/[id]', params: { id } })}
      onApplications={authenticated ? () => router.push('/jobs/applications') : undefined}
    />
  );
}
