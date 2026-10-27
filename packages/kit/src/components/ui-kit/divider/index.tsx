import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../../../hooks/use-theme';

type DividerProps = {
  inset?: number;
  vertical?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Divider({ inset = 0, vertical = false, style }: DividerProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        vertical ? styles.vertical : styles.horizontal,
        {
          backgroundColor: theme.border,
          marginLeft: vertical ? 0 : inset,
          marginTop: vertical ? inset : 0,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
  },
  vertical: {
    width: StyleSheet.hairlineWidth,
    height: '100%',
  },
});
