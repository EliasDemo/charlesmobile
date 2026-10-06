import { useMemo, useState } from 'react';
import { env } from '@/shared/config';
import { upcomingDays } from '@/shared/lib';
import { useCategories } from './useSearchResults';
import { EMPTY_FILTERS, useSearchStore, type SearchFilters } from './searchStore';

/** Bookable horizon documented by the API (DATE_OUT_OF_RANGE beyond 30 days). */
const DATE_HORIZON_DAYS = 30;

/** Filters screen: edits a draft and applies it only on "Ver resultados". */
export function useFiltersDraft({ onApplied }: { onApplied: () => void }) {
  const applied = useSearchStore((s) => s.filters);
  const setFilters = useSearchStore((s) => s.setFilters);
  const hasCenter = useSearchStore((s) => s.center !== null);
  const [draft, setDraft] = useState<SearchFilters>(applied);
  const categories = useCategories();
  const days = useMemo(() => upcomingDays(env.defaultTimeZone, DATE_HORIZON_DAYS), []);

  const update = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  /** Tapping the selected option again clears it. */
  const toggle = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) =>
    setDraft((current) => ({ ...current, [key]: current[key] === value ? EMPTY_FILTERS[key] : value }));

  return {
    draft,
    update,
    toggle,
    categories,
    days,
    hasCenter,
    clear: () => setDraft(EMPTY_FILTERS),
    apply: () => {
      setFilters(draft);
      onApplied();
    },
  };
}
