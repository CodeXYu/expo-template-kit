import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';

import { Colors, type ColorTokens, type ThemeConfig, type ThemeName } from '../constants/theme';
import {
  mergeThemeUiTokens,
  type ThemeUiTokens,
} from '../constants/theme-ui';

type ThemeContextValue = {
  colorScheme: ThemeName;
  theme: ColorTokens;
  config?: ThemeConfig;
  uiTokens: ThemeUiTokens;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export type ThemeProviderProps = PropsWithChildren<{
    colorScheme: ThemeName;
    /** Project-owned colors, typography, component, and overlay defaults. */
    theme?: ThemeConfig;
  }>;

/** Provide a project-selected color scheme to all shared themed components. */
export function ThemeProvider({
  children,
  colorScheme,
  theme,
}: ThemeProviderProps) {
  const value = useMemo<ThemeContextValue>(
    () => ({
      colorScheme,
      theme: { ...Colors[colorScheme], ...theme?.colors?.[colorScheme] } as ColorTokens,
      config: theme,
      uiTokens: mergeThemeUiTokens(theme?.ui),
    }),
    [colorScheme, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  return useContext(ThemeContext);
}

export function useThemeUiTokens() {
  return useContext(ThemeContext)?.uiTokens ?? mergeThemeUiTokens();
}
