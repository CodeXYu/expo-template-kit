import { useCallback, useEffect, useState } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { PressableEvent } from 'react-native-gesture-handler/lib/typescript/components/Pressable/PressableProps';
import { TouchableWrapper, type TouchableWrapperProps } from '../touchable-wrapper';

export type AnimatedTouchableWrapperAnimationConfig = {
  pressedScale?: number;
  pressedOpacity?: number;
  pressInDuration?: number;
  pressOutDuration?: number;
};

export interface AnimatedTouchableWrapperProps extends TouchableWrapperProps {
  animationEnabled?: boolean;
  animationConfig?: AnimatedTouchableWrapperAnimationConfig;
  animatedStyle?: StyleProp<ViewStyle>;
}

const DEFAULT_ANIMATION_CONFIG = {
  pressedScale: 0.98,
  pressedOpacity: 0.96,
  pressInDuration: 120,
  pressOutDuration: 140,
} satisfies Required<AnimatedTouchableWrapperAnimationConfig>;

/**
 * Animated visual wrapper that reuses TouchableWrapper for press behavior.
 * The animated view wraps the whole touch target so scale/opacity affect the
 * container, background, border, and children together.
 */
export function AnimatedTouchableWrapper({
  animationEnabled = true,
  animationConfig,
  animatedStyle,
  children,
  onPressIn,
  onPressOut,
  ...touchableProps
}: AnimatedTouchableWrapperProps) {
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const config = {
    ...DEFAULT_ANIMATION_CONFIG,
    ...animationConfig,
  };

  useEffect(() => {
    if (!animationEnabled) {
      scale.value = 1;
      opacity.value = 1;
      return;
    }

    scale.value = withTiming(pressed ? config.pressedScale : 1, {
      duration: pressed ? config.pressInDuration : config.pressOutDuration,
    });
    opacity.value = withTiming(pressed ? config.pressedOpacity : 1, {
      duration: pressed ? config.pressInDuration : config.pressOutDuration,
    });
  }, [
    animationEnabled,
    config.pressInDuration,
    config.pressOutDuration,
    config.pressedOpacity,
    config.pressedScale,
    opacity,
    pressed,
    scale,
  ]);

  const animatedViewStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  }, []);

  const handlePressIn: TouchableWrapperProps['onPressIn'] = useCallback(
    (event: PressableEvent) => {
      setPressed(true);
      onPressIn?.(event);
    },
    [onPressIn]
  );

  const handlePressOut: TouchableWrapperProps['onPressOut'] = useCallback(
    (event: PressableEvent) => {
      setPressed(false);
      onPressOut?.(event);
    },
    [onPressOut]
  );

  return (
    <Animated.View style={[animatedViewStyle, animatedStyle]}>
      <TouchableWrapper {...touchableProps} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        {children}
      </TouchableWrapper>
    </Animated.View>
  );
}
