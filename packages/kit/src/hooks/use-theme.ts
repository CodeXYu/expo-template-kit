/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useColorScheme } from './use-color-scheme';
import { Colors, type ColorTokens, type ThemeName } from '../constants/theme';
import { useThemeContext } from '../providers/theme-provider';

/** Return the active light/dark scheme after applying the project preference. */
export function useThemeName(): ThemeName {
  const themeContext = useThemeContext();
  const scheme = useColorScheme();

  return themeContext?.colorScheme ?? (scheme === 'dark' ? 'dark' : 'light');
}

/** Return the resolved color tokens for the active scheme. */
export function useTheme(): ColorTokens {
  const themeContext = useThemeContext();
  const themeName = useThemeName();

  return (themeContext?.theme ?? Colors[themeName]) as ColorTokens;
}
