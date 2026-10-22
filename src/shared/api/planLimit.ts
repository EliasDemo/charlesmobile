import { create } from 'zustand';
import { isApiError } from './errors';

export type PlanLimitKind = 'limit' | 'feature';

interface PlanLimitState {
  /** The last plan limit the person hit, until the notice is closed. */
  hit: { kind: PlanLimitKind; key: string | null } | null;
  close: () => void;
}

export const usePlanLimit = create<PlanLimitState>((set) => ({
  hit: null,
  close: () => set({ hit: null }),
}));

/**
 * 403 PLAN_LIMIT_REACHED or PLAN_FEATURE_NOT_INCLUDED from any action (creating barbers, photos,
 * promotions, messages, the panel…): one notice with "Ver mi plan" instead of a loose error.
 */
export function notePlanLimit(error: unknown): void {
  if (!isApiError(error)) return;
  if (error.code !== 'PLAN_LIMIT_REACHED' && error.code !== 'PLAN_FEATURE_NOT_INCLUDED') return;
  const key = error.details[0]?.key;
  usePlanLimit.setState({
    hit: {
      kind: error.code === 'PLAN_LIMIT_REACHED' ? 'limit' : 'feature',
      key: typeof key === 'string' ? key : null,
    },
  });
}
