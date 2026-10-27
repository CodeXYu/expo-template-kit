import { useCallback, useEffect, useRef, useState } from 'react';

import SplashScreen from '../lib/splash-screen';

export type AppInitializer = () => Promise<void>;

export type UseAppReadyResult = {
  isReady: boolean;
  isInitializing: boolean;
  error: Error | null;
  retry: () => Promise<void>;
};

/**
 * App boot work belongs in one hook so the root layout stays declarative and
 * future startup tasks can be added without scattering lifecycle code.
 *
 * Example:
 * ```ts
 * const initializeApp = async () => {
 *   await Promise.all([initializeI18n(), hydratePreferences()]);
 * };
 * const { isReady } = useAppReady(initializeApp);
 * ```
 * Keep `initializeApp` module-scoped or memoized so startup does not restart
 * because the callback identity changed.
 */
export function useAppReady(initializeApp: AppInitializer): UseAppReadyResult {
  const [isReady, setIsReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasStartedRef = useRef(false);

  const run = useCallback(async () => {
    setIsInitializing(true);

    try {
      await initializeApp();

      setError(null);
      setIsReady(true);
    } catch (nextError) {
      setIsReady(false);
      setError(nextError instanceof Error ? nextError : new Error('Failed to initialize app'));
    } finally {
      // Do not leave the native launch screen over the error-capable route tree.
      SplashScreen.hide();
      setIsInitializing(false);
    }
  }, [initializeApp]);

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;
    const timer = setTimeout(() => {
      void run();
    }, 0);

    return () => {
      clearTimeout(timer);
      hasStartedRef.current = false;
    };
  }, [run]);

  return {
    isReady,
    isInitializing,
    error,
    retry: run,
  };
}
