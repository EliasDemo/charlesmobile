import { useQuery } from '@tanstack/react-query';
import { fetchReadiness, shopKeys, type ReadinessIssue } from '../api/shopApi';

/** Where each issue is fixed (a section of "Mi barbería"). */
export type ReadinessTarget = 'review' | 'hours' | 'services' | 'barbers' | 'plan';

export const READINESS_TARGET: Record<ReadinessIssue['code'], ReadinessTarget> = {
  NOT_PUBLISHED: 'review',
  NO_BUSINESS_HOURS: 'hours',
  NO_SERVICES: 'services',
  NO_ACTIVE_BARBERS: 'barbers',
  BARBER_WITHOUT_SERVICES: 'barbers',
  INVITATION_PENDING: 'barbers',
  BARBERS_SUSPENDED_BY_PLAN: 'plan',
};

/**
 * "Lista para reservar": the backend decides whether clients can book and says what is missing
 * (its `message` is ready to show). Blocking issues first, then warnings.
 */
export function useReadiness(shopId: string | undefined) {
  const query = useQuery({
    queryKey: shopKeys.readiness(shopId ?? ''),
    queryFn: () => fetchReadiness(shopId!),
    enabled: Boolean(shopId),
    staleTime: 0,
  });
  const issues = [...(query.data?.issues ?? [])].sort(
    (a, b) => Number(b.severity === 'BLOCKING') - Number(a.severity === 'BLOCKING'),
  );
  return { ready: query.data?.ready ?? null, bookableBarbers: query.data?.bookableBarbers ?? 0, issues };
}
