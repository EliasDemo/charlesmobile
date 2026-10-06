import { useState } from 'react';
import { Linking } from 'react-native';
import { getCurrentCoordinates, getLocationPermission, requestLocationPermission } from '@/shared/lib';
import { useSearchStore } from './searchStore';

/**
 * - `explaining`: the app's own explanation is on screen, before the system dialog.
 * - `denied` / `blocked`: no permission; text search keeps working.
 * - `unavailable`: permission given but the position could not be read.
 */
export type NearMeStatus = 'idle' | 'explaining' | 'locating' | 'denied' | 'blocked' | 'unavailable';

/**
 * "Cerca de mí". Location is asked only here, after an explanation, never when the app opens.
 * The coordinates live only in memory (search store) and are not saved.
 */
export function useNearMe() {
  const center = useSearchStore((s) => s.center);
  const setCenter = useSearchStore((s) => s.setCenter);
  const [status, setStatus] = useState<NearMeStatus>('idle');

  const locate = async () => {
    setStatus('locating');
    try {
      const coordinates = await getCurrentCoordinates();
      setCenter({ ...coordinates, source: 'device' });
      setStatus('idle');
    } catch {
      setStatus('unavailable');
    }
  };

  const start = async () => {
    const permission = await getLocationPermission();
    if (permission === 'granted') return locate();
    if (permission === 'blocked') return setStatus('blocked');
    setStatus('explaining');
  };

  const acceptExplanation = async () => {
    const permission = await requestLocationPermission();
    if (permission === 'granted') return locate();
    setStatus(permission === 'blocked' ? 'blocked' : 'denied');
  };

  return {
    active: center?.source === 'device',
    status,
    start: () => void start(),
    acceptExplanation: () => void acceptExplanation(),
    dismiss: () => setStatus('idle'),
    stop: () => {
      setCenter(null);
      setStatus('idle');
    },
    openSettings: () => void Linking.openSettings(),
  };
}
