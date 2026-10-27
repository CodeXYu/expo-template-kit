import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { useTheme } from '../../../hooks/use-theme';
import { useDeviceMetrics } from '../../../hooks/use-device-metrics';

export const Empty = (props: { image?: string; text?: string; style?: StyleProp<ViewStyle> }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { safeAreaFrame } = useDeviceMetrics();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Math.max(safeAreaFrame.height / 2 - 240, 32) },
        props.style,
      ]}
    >
      <Image style={styles.image} source={props.image} />
      <Text style={[styles.text, { color: theme.textTertiary }]}>
        {props.text || t('common.no_data')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    height: 120,
    width: 120,
  },
  text: {
    fontSize: 12,
    marginTop: 12,
  },
});
