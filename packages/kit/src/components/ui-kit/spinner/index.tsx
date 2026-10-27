import { ActivityIndicator, View, type ActivityIndicatorProps } from 'react-native';

import { useTheme } from '../../../hooks/use-theme';

type SpinnerProps = ActivityIndicatorProps & {
  centered?: boolean;
};

export function Spinner({ centered = false, color, style, ...restProps }: SpinnerProps) {
  const theme = useTheme();

  return (
    <View style={centered ? { alignItems: 'center', justifyContent: 'center' } : undefined}>
      <ActivityIndicator color={color ?? theme.primary} style={style} {...restProps} />
    </View>
  );
}
