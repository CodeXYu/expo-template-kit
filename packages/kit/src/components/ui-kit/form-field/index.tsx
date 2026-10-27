import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../../../hooks/use-theme';
import { useThemeUiTokens } from '../../../providers/theme-provider';

export interface FormFieldProps {
  /** Localized field label. Omit only when the child has its own visible label. */
  label?: string;
  required?: boolean;
  helperText?: string;
  error?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  messageStyle?: StyleProp<TextStyle>;
}

/**
 * Shared form layout for label, helper copy, and validation feedback.
 * It deliberately does not own input state or validation rules.
 */
export function FormField({
  label,
  required = false,
  helperText,
  error,
  children,
  style,
  labelStyle,
  messageStyle,
}: FormFieldProps) {
  const theme = useTheme();
  const ui = useThemeUiTokens();
  const message = error ?? helperText;

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text style={[styles.label, ui.typography.formLabel, { color: theme.text }, labelStyle]}>
          {label}
          {required ? <Text style={{ color: theme.danger }}> *</Text> : null}
        </Text>
      ) : null}
      {children}
      {message ? (
        <Text
          accessibilityLiveRegion={error ? 'polite' : 'none'}
          style={[
            styles.message,
            ui.typography.formMessage,
            { color: error ? theme.danger : theme.textSecondary },
            messageStyle,
          ]}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: {},
  message: {},
});
