import { router } from 'expo-router';
import { DeleteAccountScreen } from '@/features/profile';

export default function DeleteAccountRoute() {
  return (
    <DeleteAccountScreen
      onDeleted={(scheduledFor) =>
        router.replace({ pathname: '/account-deleted', params: scheduledFor ? { scheduledFor } : {} })
      }
    />
  );
}
