import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * Web keeps a stable light fallback during SSR/static render and defers to
 * the browser-reported scheme once client hooks are available.
 */
export function useColorScheme() {
  const colorScheme = useRNColorScheme();
  return colorScheme ?? 'light';
}
