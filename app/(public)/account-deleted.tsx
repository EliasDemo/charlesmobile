import { router, useLocalSearchParams } from 'expo-router';
import { AccountDeletedScreen } from '@/features/profile';
import { paramString } from '@/shared/lib';

// Public: the session no longer exists after requesting the deletion.
export default function AccountDeletedRoute() {
  const params = useLocalSearchParams<{ scheduledFor?: string }>();
  return (
    <AccountDeletedScreen
      scheduledFor={paramString(params.scheduledFor)}
      onHome={() => router.replace('/')}
    />
  );
}
