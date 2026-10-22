import { router } from 'expo-router';
import { MyCareerProfileScreen } from '@/features/career';
import { useHasApplied } from '@/features/jobs';
import { MyVideos } from '@/features/videos';

export default function MyCareerRoute() {
  const hasApplied = useHasApplied();
  return (
    <MyCareerProfileScreen
      hasApplied={hasApplied}
      onEdit={() => router.push('/career/edit')}
      onSpecialties={() => router.push('/career/specialties')}
      onAddCut={() => router.push('/career/add-cut')}
      onOpenPublic={(id) => router.push({ pathname: '/barber/[id]', params: { id } })}
      onOpenShop={(id) => router.push({ pathname: '/barbershop/[id]', params: { id } })}
      onJobs={() => router.push('/jobs')}
      onApplications={() => router.push('/jobs/applications')}
      videos={() => <MyVideos />}
    />
  );
}
