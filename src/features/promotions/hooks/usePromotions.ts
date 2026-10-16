import { useQuery } from '@tanstack/react-query';
import { fetchActivePromotions, promotionKeys } from '../api/promotionsApi';

export function useActivePromotions(barbershopId: string) {
  return useQuery({
    queryKey: promotionKeys.active(barbershopId),
    queryFn: () => fetchActivePromotions(barbershopId),
  });
}
