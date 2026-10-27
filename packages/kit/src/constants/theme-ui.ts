import type { TextStyle, ViewStyle } from 'react-native';

import { Fonts } from './theme';

export type ThemeTypographyTokens = {
  default: TextStyle;
  small: TextStyle;
  smallBold: TextStyle;
  title: TextStyle;
  subtitle: TextStyle;
  link: TextStyle;
  code: TextStyle;
  buttonLabel: TextStyle;
  input: TextStyle;
  formLabel: TextStyle;
  formMessage: TextStyle;
  listTitle: TextStyle;
  listDetail: TextStyle;
  toast: TextStyle;
  loading: TextStyle;
};

export type ThemeUiTokens = {
  typography: ThemeTypographyTokens;
  button: { borderRadius: number; heights: Record<'sm' | 'md' | 'lg', number> };
  input: { borderRadius: number; minHeight: number; multilineMinHeight: number };
  listRow: { minHeight: number };
  toast: { borderRadius: number; minHeight: number; maxWidth: number };
  loading: { borderRadius: number; minWidth: number; maxWidth: number };
  overlay: {
    backdropOpacity: number;
    modalContainerStyle?: ViewStyle;
    sheetContainerStyle?: ViewStyle;
    popoverStyle?: ViewStyle;
    popover: {
      arrowSize: number;
      borderRadius: number;
      borderWidth: number;
      paddingCorner: number;
      pixelSize: number;
    };
  };
};

/** Project overrides may target a single nested component token. */
export type ThemeUiOverrides = {
  typography?: Partial<ThemeTypographyTokens>;
  button?: Partial<Omit<ThemeUiTokens['button'], 'heights'>> & {
    heights?: Partial<ThemeUiTokens['button']['heights']>;
  };
  input?: Partial<ThemeUiTokens['input']>;
  listRow?: Partial<ThemeUiTokens['listRow']>;
  toast?: Partial<ThemeUiTokens['toast']>;
  loading?: Partial<ThemeUiTokens['loading']>;
  overlay?: Partial<Omit<ThemeUiTokens['overlay'], 'popover'>> & {
    popover?: Partial<ThemeUiTokens['overlay']['popover']>;
  };
};

/** Defaults for shared UI structure. Project overrides are merged by ThemeProvider. */
export const DefaultThemeUiTokens: ThemeUiTokens = {
  typography: {
    default: { fontFamily: Fonts.sans, fontSize: 16, fontWeight: '500', lineHeight: 24 },
    small: { fontFamily: Fonts.sans, fontSize: 14, fontWeight: '500', lineHeight: 20 },
    smallBold: { fontFamily: Fonts.sans, fontSize: 14, fontWeight: '700', lineHeight: 20 },
    title: { fontFamily: Fonts.sans, fontSize: 48, fontWeight: '600', lineHeight: 52 },
    subtitle: { fontFamily: Fonts.sans, fontSize: 32, fontWeight: '600', lineHeight: 44 },
    link: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 30 },
    code: { fontFamily: Fonts.mono, fontSize: 12, fontWeight: '500' },
    buttonLabel: { fontFamily: Fonts.sans, fontSize: 16, fontWeight: '600' },
    input: { fontFamily: Fonts.sans, fontSize: 16 },
    formLabel: { fontFamily: Fonts.sans, fontSize: 13, fontWeight: '500', lineHeight: 18 },
    formMessage: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 },
    listTitle: { fontFamily: Fonts.sans, fontSize: 16, fontWeight: '500' },
    listDetail: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20 },
    toast: { fontFamily: Fonts.sans, fontSize: 15, fontWeight: '500', lineHeight: 21 },
    loading: { fontFamily: Fonts.sans, fontSize: 14 },
  },
  button: { borderRadius: 16, heights: { sm: 40, md: 48, lg: 56 } },
  input: { borderRadius: 16, minHeight: 48, multilineMinHeight: 96 },
  listRow: { minHeight: 52 },
  toast: { borderRadius: 16, minHeight: 48, maxWidth: 320 },
  loading: { borderRadius: 12, minWidth: 120, maxWidth: 240 },
  overlay: {
    // The theme `overlay` color owns the default alpha. Keeping this at 1
    // avoids applying RGBA alpha a second time to every backdrop.
    backdropOpacity: 1,
    popover: {
      arrowSize: 7,
      borderRadius: 6,
      borderWidth: 1,
      paddingCorner: 12,
      pixelSize: 0.5,
    },
  },
};

export function mergeThemeUiTokens(overrides?: ThemeUiOverrides): ThemeUiTokens {
  return {
    ...DefaultThemeUiTokens,
    ...overrides,
    typography: { ...DefaultThemeUiTokens.typography, ...overrides?.typography },
    button: {
      ...DefaultThemeUiTokens.button,
      ...overrides?.button,
      heights: { ...DefaultThemeUiTokens.button.heights, ...overrides?.button?.heights },
    },
    input: { ...DefaultThemeUiTokens.input, ...overrides?.input },
    listRow: { ...DefaultThemeUiTokens.listRow, ...overrides?.listRow },
    toast: { ...DefaultThemeUiTokens.toast, ...overrides?.toast },
    loading: { ...DefaultThemeUiTokens.loading, ...overrides?.loading },
    overlay: {
      ...DefaultThemeUiTokens.overlay,
      ...overrides?.overlay,
      popover: {
        ...DefaultThemeUiTokens.overlay.popover,
        ...overrides?.overlay?.popover,
      },
    },
  };
}
