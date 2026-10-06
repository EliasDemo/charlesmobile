import { useEffect, useRef } from 'react';
import { onSessionEnded, queryClient } from '@/shared/api';

/**
 * When renewal fails (401 that cannot be recovered), the session is already cleared: forget the
 * cached data too and send the user to login, remembering the screen they were on.
 */
export function useSessionEndedRedirect(currentPath: string, goToLogin: (returnTo: string) => void) {
  const pathRef = useRef(currentPath);
  const goRef = useRef(goToLogin);
  useEffect(() => {
    pathRef.current = currentPath;
    goRef.current = goToLogin;
  }, [currentPath, goToLogin]);

  useEffect(
    () =>
      onSessionEnded(() => {
        queryClient.clear();
        goRef.current(pathRef.current);
      }),
    [],
  );
}
