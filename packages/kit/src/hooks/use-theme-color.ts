import { Colors, type ColorTokens, type ThemeColor } from '../constants/theme';
import { useColorScheme } from './use-color-scheme';
import { useThemeContext } from '../providers/theme-provider';

/**
 * Resolve a theme token with optional explicit overrides.
 * This keeps legacy-style components usable while the app converges on a shared token map.
 */
export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: ThemeColor
): string {
  const themeContext = useThemeContext();
  const colorScheme = useColorScheme();
  const resolvedColorScheme =
    themeContext?.colorScheme ?? (colorScheme === 'dark' ? 'dark' : 'light');
  const resolvedTheme = (themeContext?.theme ?? Colors[resolvedColorScheme]) as ColorTokens;
  const colorFromProps = props[resolvedColorScheme];

  return colorFromProps ?? resolvedTheme[colorName];
}
