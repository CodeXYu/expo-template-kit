import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable as RNPressable,
  StyleSheet,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  Pressable as GHPressable,
  type PressableProps as GHPressableProps,
} from 'react-native-gesture-handler';

let lastGlobalPressTime = 0;
let globalPressInterval = 500;

/**
 * Updates the module-wide interval used by global click protection.
 * This gate is intentionally shared by every TouchableWrapper instance so
 * adjacent controls cannot accidentally fire in the same tap burst.
 */
export function setGlobalPressInterval(ms: number) {
  globalPressInterval = Math.max(150, ms);
}

type TouchableWrapperStyleState = {
  pressed: boolean;
  disabled: boolean;
};

export type TouchableWrapperMode = 'none' | 'debounce' | 'throttle';

/**
 * Props for the base touch wrapper.
 *
 * TouchableWrapper owns only press behavior: Pressable rendering, disabled/loading
 * state, pressed style resolution, debounce/throttle, and optional global
 * protection. Visual animation belongs in AnimatedTouchableWrapper.
 */
export interface TouchableWrapperProps extends Omit<GHPressableProps, 'onPress' | 'style'> {
  children: React.ReactNode;
  onPress?: () => void;
  mode?: TouchableWrapperMode;
  delay?: number;
  enableGlobalProtection?: boolean;
  disabled?: boolean;
  loading?: boolean;
  useNativePressable?: boolean;
  style?: StyleProp<ViewStyle> | ((state: TouchableWrapperStyleState) => StyleProp<ViewStyle>);
}

function resolveStyle(
  style: TouchableWrapperProps['style'],
  state: TouchableWrapperStyleState
): StyleProp<ViewStyle> {
  return typeof style === 'function' ? style(state) : style;
}

function normalizeDelay(delay: number) {
  return Math.max(0, delay);
}

/**
 * Centralizes the click gate so rendering code stays small and animation-free.
 *
 * - none: runs immediately, only respecting global protection.
 * - debounce: runs once after the final click in a burst.
 * - throttle: runs immediately, then remains locked until the user has stopped
 *   clicking for delay ms. It does not replay a final trailing click.
 */
function usePressGate({
  delay,
  disabled,
  enableGlobalProtection,
  mode,
  onPress,
}: {
  delay: number;
  disabled: boolean;
  enableGlobalProtection: boolean;
  mode: TouchableWrapperMode;
  onPress?: () => void;
}) {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttleUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isThrottleLockedRef = useRef(false);
  const isMountedRef = useRef(true);

  /** Checks the module-wide protection window without mutating it. */
  const canPassGlobalProtection = useCallback(
    (now: number) => !enableGlobalProtection || now - lastGlobalPressTime >= globalPressInterval,
    [enableGlobalProtection]
  );

  /** Records the latest successful press for module-wide protection. */
  const markGlobalPress = useCallback(
    (now: number) => {
      if (enableGlobalProtection) {
        lastGlobalPressTime = now;
      }
    },
    [enableGlobalProtection]
  );

  /** Clears a pending debounce callback when a new click arrives or unmounts. */
  const clearDebounceTimer = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  /** Clears the throttle unlock timer while preserving the current lock flag. */
  const clearThrottleUnlockTimer = useCallback(() => {
    if (throttleUnlockTimerRef.current) {
      clearTimeout(throttleUnlockTimerRef.current);
      throttleUnlockTimerRef.current = null;
    }
  }, []);

  /** Ensures no delayed callback can fire after this component unmounts. */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      clearDebounceTimer();
      clearThrottleUnlockTimer();
    };
  }, [clearDebounceTimer, clearThrottleUnlockTimer]);

  /**
   * Extends the throttle lock to delay ms after the latest blocked click.
   * This is the key behavior that prevents long rapid-click bursts from leaking.
   */
  const resetThrottleUnlockTimer = useCallback(() => {
    clearThrottleUnlockTimer();

    throttleUnlockTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        isThrottleLockedRef.current = false;
      }
      throttleUnlockTimerRef.current = null;
    }, delay);
  }, [clearThrottleUnlockTimer, delay]);

  return useCallback(() => {
    if (disabled || !onPress) {
      return;
    }

    const now = Date.now();

    switch (mode) {
      case 'none':
        if (!canPassGlobalProtection(now)) {
          return;
        }
        markGlobalPress(now);
        onPress();
        break;

      case 'debounce':
        clearDebounceTimer();

        debounceTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            const fireTime = Date.now();
            if (!canPassGlobalProtection(fireTime)) {
              debounceTimerRef.current = null;
              return;
            }
            markGlobalPress(fireTime);
            onPress();
          }
          debounceTimerRef.current = null;
        }, delay);
        break;

      case 'throttle':
      default:
        if (isThrottleLockedRef.current) {
          resetThrottleUnlockTimer();
          return;
        }

        isThrottleLockedRef.current = true;
        resetThrottleUnlockTimer();
        if (!canPassGlobalProtection(now)) {
          return;
        }

        markGlobalPress(now);
        onPress();
        break;
    }
  }, [
    canPassGlobalProtection,
    clearDebounceTimer,
    delay,
    disabled,
    markGlobalPress,
    mode,
    onPress,
    resetThrottleUnlockTimer,
  ]);
}

/**
 * Base Pressable wrapper for all shared UI controls.
 *
 * The public ref type follows the default Gesture Handler Pressable path.
 * When useNativePressable is true, the runtime component changes to RN Pressable
 * and the ref is bridged internally for compatibility with the existing API.
 */
export const TouchableWrapper = forwardRef<
  React.ElementRef<typeof GHPressable>,
  TouchableWrapperProps
>(
  (
    {
      children,
      onPress,
      mode = 'throttle',
      delay = 500,
      enableGlobalProtection = false,
      disabled = false,
      loading = false,
      pressRetentionOffset = { top: 8, bottom: 8, left: 12, right: 12 },
      hitSlop = { top: 12, bottom: 12, left: 16, right: 16 },
      unstable_pressDelay = 0,
      useNativePressable = false,
      style,
      onPressIn,
      onPressOut,
      accessibilityRole,
      accessibilityState,
      ...restProps
    },
    ref
  ) => {
    const [isPressed, setIsPressed] = useState(false);
    const isDisabled = disabled || loading;
    const normalizedDelay = normalizeDelay(delay);
    // Gesture Handler allows null while RN Pressable expects undefined.
    // Normalize both paths so null still means "use the platform default".
    const resolvedHitSlop = hitSlop ?? undefined;
    const resolvedPressRetentionOffset = pressRetentionOffset ?? undefined;

    const handlePress = usePressGate({
      delay: normalizedDelay,
      disabled: isDisabled,
      enableGlobalProtection,
      mode,
      onPress,
    });

    const handlePressIn = useCallback(
      (event: GestureResponderEvent) => {
        if (!isDisabled) {
          setIsPressed(true);
        }
        onPressIn?.(event as never);
      },
      [isDisabled, onPressIn]
    );

    const handlePressOut = useCallback(
      (event: GestureResponderEvent) => {
        setIsPressed(false);
        onPressOut?.(event as never);
      },
      [onPressOut]
    );

    const getResolvedStyle = useCallback(
      (pressed: boolean) =>
        [
          styles.base,
          resolveStyle(style, { pressed, disabled: isDisabled }),
        ] as StyleProp<ViewStyle>,
      [isDisabled, style]
    );

    const passthroughProps = restProps as Record<string, unknown>;
    const resolvedAccessibilityState = {
      ...accessibilityState,
      disabled: isDisabled,
      busy: loading || accessibilityState?.busy,
    };
    const resolvedAccessibilityRole = accessibilityRole ?? (onPress ? 'button' : undefined);

    if (useNativePressable) {
      return (
        <RNPressable
          ref={ref as React.Ref<React.ElementRef<typeof RNPressable>>}
          onPress={handlePress}
          onPressIn={handlePressIn as never}
          onPressOut={handlePressOut as never}
          style={({ pressed }) => getResolvedStyle(pressed)}
          disabled={isDisabled}
          pressRetentionOffset={resolvedPressRetentionOffset}
          hitSlop={resolvedHitSlop}
          accessibilityRole={resolvedAccessibilityRole}
          accessibilityState={resolvedAccessibilityState}
          {...passthroughProps}
        >
          {children}
        </RNPressable>
      );
    }

    return (
      <GHPressable
        ref={ref}
        onPress={handlePress}
        onPressIn={handlePressIn as never}
        onPressOut={handlePressOut as never}
        style={getResolvedStyle(isPressed)}
        disabled={isDisabled}
        pressRetentionOffset={resolvedPressRetentionOffset}
        hitSlop={resolvedHitSlop}
        unstable_pressDelay={unstable_pressDelay}
        accessibilityRole={resolvedAccessibilityRole}
        accessibilityState={resolvedAccessibilityState}
        {...passthroughProps}
      >
        {children}
      </GHPressable>
    );
  }
);

TouchableWrapper.displayName = 'TouchableWrapper';

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
