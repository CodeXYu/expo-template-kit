/* eslint-disable react-hooks/exhaustive-deps -- Reanimated shared values are stable refs */
import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useThemeUiTokens } from '../../../../providers/theme-provider';
import { OVERLAY_ANIMATION_DURATION, OVERLAY_EASING } from './constants';
import OverlayBase from './OverlayBase';
import type { OverlayInstanceRef, OverlayModalInternalProps } from '../types';

const ANIMATION_CONFIG = {
  duration: OVERLAY_ANIMATION_DURATION,
  easing: OVERLAY_EASING,
};

const OverlayModal = forwardRef<OverlayInstanceRef, OverlayModalInternalProps>((props, ref) => {
  const {
    type = 'zoomOut',
    containerStyle,
    customBounds,
    animated = true,
    children,
    ...others
  } = props;
  const ui = useThemeUiTokens();

  const overlayRef = useRef<OverlayInstanceRef>(null);
  const [showed, setShowed] = useState(false);
  const viewLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const opacityAnim = useSharedValue(0);
  const translateXAnim = useSharedValue(0);
  const translateYAnim = useSharedValue(0);
  const scaleXAnim = useSharedValue(1);
  const scaleYAnim = useSharedValue(1);

  const getFromTransform = useCallback(() => {
    const tb = viewLayoutRef.current;
    if (tb.width === 0 || tb.height === 0) {
      return { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1 };
    }

    let fb: { x: number; y: number; width: number; height: number };

    if (type === 'custom' && customBounds) {
      fb = customBounds;
    } else {
      const zoomRate = type === 'zoomIn' ? 0.3 : 1.2;
      fb = {
        x: tb.x - (tb.width * zoomRate - tb.width) / 2,
        y: tb.y - (tb.height * zoomRate - tb.height) / 2,
        width: tb.width * zoomRate,
        height: tb.height * zoomRate,
      };
    }

    return {
      translateX: fb.x + fb.width / 2 - (tb.x + tb.width / 2),
      translateY: fb.y + fb.height / 2 - (tb.y + tb.height / 2),
      scaleX: fb.width / tb.width,
      scaleY: fb.height / tb.height,
    };
  }, [type, customBounds]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacityAnim.value,
    transform: [
      { translateX: translateXAnim.value },
      { translateY: translateYAnim.value },
      { scaleX: scaleXAnim.value },
      { scaleY: scaleYAnim.value },
    ],
  }));

  const appear = useCallback(
    (isAnimated: boolean = animated) => {
      if (isAnimated) {
        const ft = getFromTransform();
        opacityAnim.value = 0;
        translateXAnim.value = ft.translateX;
        translateYAnim.value = ft.translateY;
        scaleXAnim.value = ft.scaleX;
        scaleYAnim.value = ft.scaleY;

        opacityAnim.value = withTiming(1, ANIMATION_CONFIG);
        translateXAnim.value = withTiming(0, ANIMATION_CONFIG);
        translateYAnim.value = withTiming(0, ANIMATION_CONFIG);
        scaleXAnim.value = withTiming(1, ANIMATION_CONFIG);
        scaleYAnim.value = withTiming(1, ANIMATION_CONFIG);

        overlayRef.current?.appear(isAnimated);
      } else {
        opacityAnim.value = 1;
        translateXAnim.value = 0;
        translateYAnim.value = 0;
        scaleXAnim.value = 1;
        scaleYAnim.value = 1;
        overlayRef.current?.appear(isAnimated);
      }
    },
    [animated, getFromTransform]
  );

  const disappear = useCallback(
    (isAnimated: boolean = animated) => {
      if (isAnimated) {
        const ft = getFromTransform();
        opacityAnim.value = withTiming(0, ANIMATION_CONFIG);
        translateXAnim.value = withTiming(ft.translateX, ANIMATION_CONFIG);
        translateYAnim.value = withTiming(ft.translateY, ANIMATION_CONFIG);
        scaleXAnim.value = withTiming(ft.scaleX, ANIMATION_CONFIG);
        scaleYAnim.value = withTiming(ft.scaleY, ANIMATION_CONFIG);

        requestAnimationFrame(() => {
          overlayRef.current?.disappear(isAnimated);
        });
      } else {
        overlayRef.current?.disappear(isAnimated);
      }
    },
    [animated, getFromTransform]
  );

  const close = useCallback(
    (isAnimated: boolean = animated) => {
      disappear(isAnimated);
      return true;
    },
    [animated, disappear]
  );

  useImperativeHandle(ref, () => ({ appear, disappear, close }), [appear, disappear, close]);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      if (width === 0 || height === 0) return;

      viewLayoutRef.current = e.nativeEvent.layout;
      if (!showed) {
        setShowed(true);
        appear(animated);
      }
    },
    [showed, animated, appear]
  );

  return (
    <OverlayBase
      ref={overlayRef}
      {...others}
      onCloseRequest={overlay => {
        if (props.onCloseRequest) {
          props.onCloseRequest(overlay);
        } else if (!props.modal) {
          disappear();
        }
      }}
    >
      <Animated.View
        pointerEvents="box-none"
        style={[styles.positioner, styles.positionerDefaultAlignment, ui.overlay.modalContainerStyle, containerStyle]}
      >
        <Animated.View style={[styles.content, animatedStyle]} onLayout={onLayout}>
          {children}
        </Animated.View>
      </Animated.View>
    </OverlayBase>
  );
});

const styles = StyleSheet.create({
  content: {
    backgroundColor: 'transparent',
    minHeight: 1,
    minWidth: 1,
  } satisfies ViewStyle,
  positioner: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  } satisfies ViewStyle,
  positionerDefaultAlignment: {
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
});

OverlayModal.displayName = 'OverlayModal';

export default OverlayModal;
