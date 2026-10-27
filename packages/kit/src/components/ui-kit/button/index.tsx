import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Spacing } from '../../../constants/theme';
import { useTheme } from '../../../hooks/use-theme';
import { useThemeUiTokens } from '../../../providers/theme-provider';

import { Spinner } from '../spinner';
import { TouchableWrapper, type TouchableWrapperProps } from '../touchable-wrapper';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<TouchableWrapperProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  style?:
    | StyleProp<ViewStyle>
    | ((state: { pressed: boolean; disabled: boolean }) => StyleProp<ViewStyle>);
  textStyle?: StyleProp<TextStyle>;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  mode,
  delay,
  enableGlobalProtection,
  leftSlot,
  rightSlot,
  style,
  textStyle,
  ...restProps
}: ButtonProps) {
  const theme = useTheme();
  const ui = useThemeUiTokens();
  const isDisabled = disabled || loading;
  const variantStyle = getVariantStyle(variant, theme);

  const mergedStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.base,
      { minHeight: ui.button.heights[size], borderRadius: ui.button.borderRadius },
      variantStyle.container,
      pressed && !isDisabled ? styles.pressed : null,
      isDisabled ? styles.disabled : null,
      typeof style === 'function' ? style({ pressed, disabled: isDisabled }) : style,
    ],
    [size, ui.button, variantStyle.container, isDisabled, style]
  );

  return (
    <TouchableWrapper
      {...restProps}
      mode={mode}
      delay={delay}
      enableGlobalProtection={enableGlobalProtection}
      loading={loading}
      disabled={disabled}
      style={mergedStyle}
    >
      <View style={styles.content}>
        {loading ? <Spinner size="small" color={variantStyle.text.color} /> : leftSlot}
        <Text style={[styles.label, ui.typography.buttonLabel, variantStyle.text, textStyle]}>{label}</Text>
        {rightSlot ? rightSlot : <View style={styles.slotPlaceholder} />}
      </View>
    </TouchableWrapper>
  );
}

function getVariantStyle(variant: ButtonVariant, theme: ReturnType<typeof useTheme>) {
  switch (variant) {
    case 'secondary':
      return {
        container: {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          borderWidth: 1,
        } satisfies ViewStyle,
        text: {
          color: theme.text,
        } satisfies TextStyle,
      };
    case 'ghost':
      return {
        container: {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        } satisfies ViewStyle,
        text: {
          color: theme.primary,
        } satisfies TextStyle,
      };
    case 'primary':
    default:
      return {
        container: {
          backgroundColor: theme.primary,
          borderColor: theme.primary,
          borderWidth: 1,
        } satisfies ViewStyle,
        text: {
          color: theme.background,
        } satisfies TextStyle,
      };
  }
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  label: {
  },
  slotPlaceholder: {
    width: 0,
    height: 0,
  },
  pressed: {
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.55,
  },
});
