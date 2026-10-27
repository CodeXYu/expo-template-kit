import * as Network from 'expo-network';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { useAppLifecycle } from './app-lifecycle-provider';
import { logger } from '../utils/logger';

export interface NetworkStatus {
  /** Latest device network state, or null while unknown. */
  networkState: Network.NetworkState | null;
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  /** True only when the operating system explicitly reports no connectivity. */
  isOffline: boolean;
  /** Re-checks device connectivity, for example before retrying a request. */
  refresh: () => Promise<Network.NetworkState | null>;
}

const NetworkStatusContext = createContext<NetworkStatus | null>(null);

/**
 * Owns the application's single network subscription. It refreshes when the
 * app becomes active because native network events can be missed in background.
 */
export function NetworkStatusProvider({ children }: PropsWithChildren) {
  const { appState } = useAppLifecycle();
  const [networkState, setNetworkState] = useState<Network.NetworkState | null>(null);
  const generationRef = useRef(0);
  const isMountedRef = useRef(false);
  const previousAppStateRef = useRef(appState);

  const refresh = useCallback(async () => {
    const generation = ++generationRef.current;

    try {
      const nextState = await Network.getNetworkStateAsync();

      if (isMountedRef.current && generation === generationRef.current) {
        setNetworkState(nextState);
      }

      return nextState;
    } catch (error) {
      logger.warn('Failed to read network status', error);

      if (isMountedRef.current && generation === generationRef.current) {
        setNetworkState(null);
      }

      return null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const networkSubscription = Network.addNetworkStateListener(nextState => {
      if (isMountedRef.current) {
        generationRef.current += 1;
        setNetworkState(nextState);
      }
    });
    void Promise.resolve().then(refresh);

    return () => {
      isMountedRef.current = false;
      generationRef.current += 1;
      networkSubscription.remove();
    };
  }, [refresh]);

  useEffect(() => {
    const previousAppState = previousAppStateRef.current;
    previousAppStateRef.current = appState;

    if (appState === 'active' && previousAppState !== 'active') {
      void Promise.resolve().then(refresh);
    }
  }, [appState, refresh]);

  const value = useMemo<NetworkStatus>(
    () => ({
      networkState,
      isConnected: networkState?.isConnected ?? null,
      isInternetReachable: networkState?.isInternetReachable ?? null,
      isOffline: networkState?.isConnected === false || networkState?.isInternetReachable === false,
      refresh,
    }),
    [networkState, refresh]
  );

  return <NetworkStatusContext.Provider value={value}>{children}</NetworkStatusContext.Provider>;
}

/** Reads the network state maintained by the root NetworkStatusProvider. */
export function useNetworkStatus(): NetworkStatus {
  const context = useContext(NetworkStatusContext);

  if (!context) {
    throw new Error('useNetworkStatus must be used within a NetworkStatusProvider.');
  }

  return context;
}
