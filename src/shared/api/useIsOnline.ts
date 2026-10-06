import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

export const useIsOnline = (): boolean =>
  useSyncExternalStore(
    (callback) => onlineManager.subscribe(callback),
    () => onlineManager.isOnline(),
  );
