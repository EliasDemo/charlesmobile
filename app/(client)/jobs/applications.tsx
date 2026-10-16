import { router } from 'expo-router';
import { MyApplicationsScreen } from '@/features/jobs';

export default function MyApplicationsRoute() {
  return <MyApplicationsScreen onOpenJob={(id) => router.push({ pathname: '/jobs/[id]', params: { id } })} />;
}
