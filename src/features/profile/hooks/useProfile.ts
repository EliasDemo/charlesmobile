import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/shared/api';
import { fetchProfile, profileKeys } from '../api/profileApi';

export function useProfile() {
  const status = useSession((s) => s.status);
  // The session copy is updated right after verifying the email; the profile may still be cached.
  const sessionVerified = useSession((s) => s.user?.emailVerified === true);
  const query = useQuery({
    queryKey: profileKeys.me,
    queryFn: fetchProfile,
    enabled: status === 'authenticated',
  });
  return {
    query,
    isAuthenticated: status === 'authenticated',
    emailVerified: sessionVerified || query.data?.emailVerified === true,
  };
}
