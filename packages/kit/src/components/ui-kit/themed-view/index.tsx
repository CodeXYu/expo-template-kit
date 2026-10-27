import { View, type ViewProps } from 'react-native';

import { type ThemeColor } from '../../../constants/theme';
import { useThemeColor } from '../../../hooks/use-theme-color';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
};

/**
 * Lightweight themed container for purely presentational components.
 * It supports explicit light/dark overrides while still defaulting to theme tokens.
 */
export function ThemedView({ style, lightColor, darkColor, type, ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    type ?? 'background'
  );

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
