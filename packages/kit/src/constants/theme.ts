/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

import type { ThemeUiOverrides } from './theme-ui';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    surface: '#FFFFFF',
    textSecondary: '#60646C',
    textTertiary: '#808692',
    textDisabled: '#9EA3AD',
    primary: '#22386A',
    icon: '#6F7890',
    border: '#D9DFEA',
    success: '#267A52',
    warning: '#A76100',
    danger: '#D84C3E',
    overlay: 'rgba(0,0,0,0.4)',
  },
  dark: {
    text: '#ffffff',
    background: '#101A31',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    surface: '#18223D',
    textSecondary: '#B0B4BA',
    textTertiary: '#8D96AE',
    textDisabled: '#6E7685',
    primary: '#FFF6E5',
    icon: '#C4CCE0',
    border: 'rgba(255,255,255,0.1)',
    success: '#62C992',
    warning: '#FFC46B',
    danger: '#FF8D82',
    overlay: 'rgba(0,0,0,0.6)',
  },
} as const;

export type ThemeName = keyof typeof Colors;
type BuiltInThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Apps extend this interface with project-specific color tokens via declaration merging.
 * Every extension value must be declared as `string`.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Apps add tokens through declaration merging.
export interface AppThemeColorTokens {}

type AppThemeColor = {
  [Key in keyof AppThemeColorTokens]: AppThemeColorTokens[Key] extends string ? Key : never;
}[keyof AppThemeColorTokens];

export type ThemeColor = BuiltInThemeColor | AppThemeColor;
/** The color values resolved for a light or dark color scheme. */
export type ColorTokens = Record<BuiltInThemeColor, string> & Record<AppThemeColor, string>;
export type ThemeOverrides = keyof AppThemeColorTokens extends never
  ? Partial<Record<ThemeName, Partial<ColorTokens>>>
  : Record<ThemeName, Partial<Record<BuiltInThemeColor, string>> & Record<AppThemeColor, string>>;

/** The only project-facing theme input: colors and all shared UI defaults live here. */
export type ThemeConfig = {
  colors?: ThemeOverrides;
  ui?: ThemeUiOverrides;
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
  /**
   * We keep semantic aliases alongside the existing numeric scale because
   * older infrastructure components still reference `sm/lg/...` tokens.
   */
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const MaxContentWidth = 800;
