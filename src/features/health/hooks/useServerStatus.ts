import { useQuery } from '@tanstack/react-query';
import { fetchHealth, healthKeys } from '../api/healthApi';

export function useServerStatus() {
  const query = useQuery({ queryKey: healthKeys.all, queryFn: fetchHealth });
  const health = query.data;
  return {
    query,
    isHealthy: health?.status === 'ok',
    status: health?.status ?? null,
    checks: health?.checks ?? null,
  };
}
