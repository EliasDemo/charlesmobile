import { useQuery } from '@tanstack/react-query';
import { isApiError } from '@/shared/api';
import { businessKeys, fetchHeatmap, fetchMarket, fetchMonthly } from '../api/businessApi';

export type InsightsTab = 'monthly' | 'heatmap' | 'market';

const MONTHS = 12;
const HEAT_DAYS = 90;
const MARKET_KM = 5;

/** The report of the open tab; heat map and market need a plan with full reports (403). */
export function useInsights(shopId: string, tab: InsightsTab) {
  const monthly = useQuery({
    queryKey: businessKeys.monthly(shopId, MONTHS),
    queryFn: () => fetchMonthly(shopId, MONTHS),
    enabled: tab === 'monthly',
  });
  const heatmap = useQuery({
    queryKey: businessKeys.heatmap(shopId, HEAT_DAYS),
    queryFn: () => fetchHeatmap(shopId, HEAT_DAYS),
    enabled: tab === 'heatmap',
    retry: false,
  });
  const market = useQuery({
    queryKey: businessKeys.market(shopId, MARKET_KM),
    queryFn: () => fetchMarket(shopId, MARKET_KM),
    enabled: tab === 'market',
    retry: false,
  });
  const current = tab === 'monthly' ? monthly : tab === 'heatmap' ? heatmap : market;
  const needsPlan = isApiError(current.error) && current.error.code === 'PLAN_FEATURE_NOT_INCLUDED';
  return { monthly, heatmap, market, needsPlan };
}
