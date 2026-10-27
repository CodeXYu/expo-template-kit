import { type ThemeConfig } from 'expo-template-kit';

declare module 'expo-template-kit' {
  interface AppThemeColorTokens {
    secondary: string;
  }
}

/**
 * Project-owned color overrides. Omitted tokens retain the template defaults,
 * so branding changes need only list the values this project changes.
 */
export const theme = {
  colors: {
    light: {
      primary: '#22386A',
      secondary: '#596C99',
      overlay: 'rgba(0, 0, 0, 0.48)',
    },
    dark: {
      primary: '#FFF6E5',
      secondary: '#D7E1FF',
      overlay: 'rgba(0, 0, 0, 0.64)',
    },
  },
} satisfies ThemeConfig;
