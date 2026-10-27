import { type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeProvider } from 'expo-template-kit';

import { theme } from '../config/theme';
import { usePreferencesStore } from '../stores/use-preferences-store';

/** Connect project-owned theme preferences to the shared component theme context. */
export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemColorScheme = useColorScheme();
  const preferredTheme = usePreferencesStore(state => state.theme);
  const colorScheme = preferredTheme ?? (systemColorScheme === 'dark' ? 'dark' : 'light');

  return (
    <ThemeProvider colorScheme={colorScheme} theme={theme}>
      {children}
    </ThemeProvider>
  );
}
