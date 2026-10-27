import { useState } from 'react';
import { i18n } from '@/shared/i18n';
import { getCurrentCoordinates, requestLocationPermission, type Coordinates } from '@/shared/lib';
import { showToast } from './Toast';

/**
 * "Más cerca": asks for the location only when the person taps it (CLAUDE.md §5) and keeps it in
 * memory, never stored; if refused, the list keeps working without it.
 */
export function useNearMe() {
  const [near, setNear] = useState<Coordinates | null>(null);
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    if (near) return setNear(null);
    setBusy(true);
    try {
      if ((await requestLocationPermission()) !== 'granted') {
        showToast(i18n.t('common:nearMe.denied'));
        return;
      }
      setNear(await getCurrentCoordinates());
    } catch {
      showToast(i18n.t('common:nearMe.failed'));
    } finally {
      setBusy(false);
    }
  };
  return { near, busy, toggle: () => void (busy ? undefined : toggle()) };
}
