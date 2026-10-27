import { AppState, type AppStateStatus } from 'react-native';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

export interface AppLifecycle {
  appState: AppStateStatus;
  isActive: boolean;
}

const AppLifecycleContext = createContext<AppLifecycle | null>(null);

// RN 0.88 types currentState as string | null | undefined until the native
// module reports its first value. Fall back to foreground so the provider
// never exposes an invalid AppStateStatus to consumers.
function resolveInitialAppState(currentState: unknown): AppStateStatus {
  switch (currentState) {
    case 'active':
    case 'background':
    case 'inactive':
    case 'extension':
    case 'unknown':
      return currentState;
    default:
      return 'active';
  }
}

/** Owns the application's single AppState subscription. */
export function AppLifecycleProvider({ children }: PropsWithChildren) {
  const [appState, setAppState] = useState<AppStateStatus>(() =>
    resolveInitialAppState(AppState.currentState)
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);

    return () => subscription.remove();
  }, []);

  const value = useMemo<AppLifecycle>(
    () => ({ appState, isActive: appState === 'active' }),
    [appState]
  );

  return <AppLifecycleContext.Provider value={value}>{children}</AppLifecycleContext.Provider>;
}

/** Reads the app lifecycle maintained by the root AppLifecycleProvider. */
export function useAppLifecycle(): AppLifecycle {
  const context = useContext(AppLifecycleContext);

  if (!context) {
    throw new Error('useAppLifecycle must be used within an AppLifecycleProvider.');
  }

  return context;
}
