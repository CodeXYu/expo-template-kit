import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Spacing } from '../../../constants/theme';
import { useTheme } from '../../../hooks/use-theme';
import { useThemeUiTokens } from '../../../providers/theme-provider';

import { TouchableWrapper } from '../touchable-wrapper';

export interface InputProps extends TextInputProps {
  error?: string;
  disabled?: boolean;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  clearAccessibilityLabel?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export function Input({
  value,
  defaultValue,
  onChangeText,
  placeholder,
  disabled = false,
  error,
  leftSlot,
  rightSlot,
  clearable = false,
  onClear,
  clearAccessibilityLabel,
  editable,
  multiline = false,
  containerStyle,
  inputStyle,
  ...restProps
}: InputProps) {
  const theme = useTheme();
  const ui = useThemeUiTokens();
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const inputEditable = editable ?? !disabled;
  const currentValue = value ?? defaultValue ?? '';
  const showClear = useMemo(
    () => clearable && !disabled && currentValue.length > 0,
    [clearable, currentValue.length, disabled]
  );

  const handleClear = () => {
    onChangeText?.('');
    onClear?.();
  };

  const borderColor = error ? theme.danger : focused ? theme.primary : theme.border;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: disabled ? theme.backgroundElement : theme.background,
            borderColor,
            opacity: disabled ? 0.7 : 1,
            alignItems: multiline ? 'flex-start' : 'center',
            borderRadius: ui.input.borderRadius,
            minHeight: ui.input.minHeight,
          },
          containerStyle,
        ]}
      >
        {leftSlot ? <View style={styles.leftSlot}>{leftSlot}</View> : null}
        <TextInput
          {...restProps}
          value={value}
          defaultValue={defaultValue}
          editable={inputEditable}
          multiline={multiline}
          placeholder={placeholder}
          placeholderTextColor={theme.textTertiary}
          onChangeText={onChangeText}
          onFocus={event => {
            setFocused(true);
            restProps.onFocus?.(event);
          }}
          onBlur={event => {
            setFocused(false);
            restProps.onBlur?.(event);
          }}
          style={[
            styles.input,
            multiline ? [styles.multilineInput, { minHeight: ui.input.multilineMinHeight }] : null,
            ui.typography.input,
            { color: disabled ? theme.textDisabled : theme.text },
            inputStyle,
          ]}
        />
        {showClear ? (
          <TouchableWrapper
            accessibilityLabel={clearAccessibilityLabel ?? t('common.clearInput')}
            onPress={handleClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
          </TouchableWrapper>
        ) : null}
        {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
      </View>
      {error ? <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  container: {
    width: '100%',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  leftSlot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightSlot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
  },
  multilineInput: {
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
  },
});
