import { Text, type TextProps } from 'react-native';

import { type ThemeColor } from '../../../constants/theme';
import { useTheme } from '../../../hooks/use-theme';
import { useThemeUiTokens } from '../../../providers/theme-provider';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

/**
 * Theme-aware text wrapper retained for display-only components.
 * Token selection stays centralized in `useTheme`, while typography variants remain local here.
 */
export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const ui = useThemeUiTokens();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && ui.typography.default,
        type === 'title' && ui.typography.title,
        type === 'small' && ui.typography.small,
        type === 'smallBold' && ui.typography.smallBold,
        type === 'subtitle' && ui.typography.subtitle,
        type === 'link' && ui.typography.link,
        type === 'linkPrimary' && [ui.typography.link, { color: theme.primary }],
        type === 'code' && ui.typography.code,
        style,
      ]}
      {...rest}
    />
  );
}
