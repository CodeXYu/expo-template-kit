import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';

import { Spacing } from '../../../constants/theme';
import { useTheme } from '../../../hooks/use-theme';
import { getErrorMessage } from '../../../utils/error';

import { TouchableWrapper } from '../../ui-kit';

export interface ErrorViewProps {
  error?: unknown;
  /** Optional already-localized message that overrides the mapped error text. */
  message?: string;
  onRetry?: () => void;
  retryButtonText?: string;
}

export const ErrorView: React.FC<ErrorViewProps> = ({
  error,
  message,
  onRetry,
  retryButtonText,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const resolvedMessage = message ?? getErrorMessage(error, t);

  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={64} color={theme.text} />
      <Text style={[styles.title, { color: theme.text }]}>{t('common.error_title')}</Text>
      <Text style={[styles.message, { color: theme.icon }]}>{resolvedMessage}</Text>
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
            {retryButtonText || t('common.retry_load')}
          </Text>
        </TouchableWrapper>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
  } satisfies ViewStyle,
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  } satisfies TextStyle,
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    lineHeight: 22,
  } satisfies TextStyle,
  button: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  } satisfies ViewStyle,
  buttonPressed: {
    opacity: 0.88,
  } satisfies ViewStyle,
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  } satisfies TextStyle,
});
