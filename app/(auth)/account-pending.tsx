import { router } from 'expo-router';
import { PendingDeletionScreen } from '@/features/auth';

export default function AccountPendingRoute() {
  return (
    <PendingDeletionScreen
      onCancelled={() => router.replace({ pathname: '/login', params: { notice: 'deletionCancelled' } })}
      onLeave={() => router.replace('/login')}
    />
  );
}
