import { Image, type ImageProps } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';

import { Spacing } from '../../../constants/theme';
import { useTheme } from '../../../hooks/use-theme';

import { TouchableWrapper } from '../../ui-kit';

export interface OfflineViewProps {
  message?: string;
  /** Aligns with expo-image's source union instead of RN's readonly image arrays. */
  image?: ImageProps['source'];
  onRetry?: () => void;
  retryText?: string;
}

export function OfflineView({ message, image, onRetry, retryText }: OfflineViewProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {image ? <Image source={image} style={styles.image} contentFit="contain" /> : null}
      <Text style={[styles.message, { color: theme.textSecondary }]}>
        {message || t('common.network_error')}
      </Text>
      {onRetry ? (
        <TouchableWrapper
          onPress={onRetry}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.primary },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.buttonText, { color: theme.background }]}>
            {retryText || t('common.retry')}
          </Text>
        </TouchableWrapper>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
  } satisfies ViewStyle,
  image: {
    width: 120,
    height: 120,
    marginBottom: Spacing.lg,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  } satisfies TextStyle,
  button: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 10,
  } satisfies ViewStyle,
  buttonPressed: {
    opacity: 0.88,
  } satisfies ViewStyle,
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  } satisfies TextStyle,
});
