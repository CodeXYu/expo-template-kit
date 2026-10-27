/* eslint-disable react-hooks/exhaustive-deps -- Reanimated shared values are stable refs */
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { Keyboard, Platform, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useThemeUiTokens } from '../../../../providers/theme-provider';
import { OVERLAY_ANIMATION_DURATION, OVERLAY_EASING, OVERLAY_ROOT_SCALE } from './constants';
import { getOverlayHostController } from './host-controller';
import OverlayBase from './OverlayBase';
import type {
  OverlayInstanceRef,
  OverlaySheetInternalProps,
  OverlaySide,
  OverlayTransformItem,
} from '../types';

const ANIMATION_CONFIG = {
  duration: OVERLAY_ANIMATION_DURATION,
  easing: OVERLAY_EASING,
};

const OverlaySheet = forwardRef<OverlayInstanceRef, OverlaySheetInternalProps>((props, ref) => {
  const {
    side = 'bottom',
    containerStyle,
    rootTransform = 'none',
    children,
    animated = true,
    autoKeyboardInsets = false,
    style,
    ...others
  } = props;
  const ui = useThemeUiTokens();

  const overlayRef = useRef<OverlayInstanceRef>(null);
  const marginValue = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const keyboardPadding = useSharedValue(0);
  const initialLayout = useRef({ width: 0, height: 0 });
  const isLayoutReady = useRef(false);
  const keyboardPaddingRef = useRef(keyboardPadding);

  const getMarginSize = useCallback(
    () =>
      side === 'left' || side === 'right'
        ? -initialLayout.current.width
        : -initialLayout.current.height,
    [side]
  );

  const getRootTransformValue = useCallback((): OverlayTransformItem[] => {
    if (!rootTransform || rootTransform === 'none') return [];

    const { width, height } = initialLayout.current;

    switch (rootTransform) {
      case 'translate':
        switch (side) {
          case 'top':
            return [{ translateY: height }];
          case 'left':
            return [{ translateX: width }];
          case 'right':
            return [{ translateX: -width }];
          default:
            return [{ translateY: -height }];
        }
      case 'scale':
        return [{ scaleX: OVERLAY_ROOT_SCALE }, { scaleY: OVERLAY_ROOT_SCALE }];
      default:
        return rootTransform;
    }
  }, [rootTransform, side]);

  const animatedStyle = useAnimatedStyle(() => {
    // RN 0.88 marks ViewStyle as readonly, so return a fresh style object
    // instead of mutating a shared one inside the worklet.
    const opacity = contentOpacity.value;
    switch (side) {
      case 'top':
        return { marginTop: marginValue.value, opacity };
      case 'left':
        return { marginLeft: marginValue.value, opacity };
      case 'right':
        return { marginRight: marginValue.value, opacity };
      default:
        return { marginBottom: marginValue.value, opacity };
    }
  });

  const keyboardAnimatedStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboardPadding.value,
  }));

  const applyRootTransform = useCallback(
    (anim: boolean) => {
      if (rootTransform && rootTransform !== 'none') {
        getOverlayHostController().transform(getRootTransformValue(), anim);
      }
    },
    [rootTransform, getRootTransformValue]
  );

  const appear = useCallback(
    (anim: boolean = animated) => {
      if (anim) {
        marginValue.value = getMarginSize();
        marginValue.value = withTiming(0, ANIMATION_CONFIG);
      } else {
        marginValue.value = 0;
      }
      applyRootTransform(anim);
      overlayRef.current?.appear(anim);
    },
    [animated, getMarginSize, applyRootTransform]
  );

  const disappear = useCallback(
    (anim: boolean = animated) => {
      getOverlayHostController().restore(anim);
      if (anim) {
        marginValue.value = withTiming(getMarginSize(), ANIMATION_CONFIG);
      } else {
        marginValue.value = getMarginSize();
      }
      overlayRef.current?.disappear(anim);
    },
    [animated, getMarginSize]
  );

  useEffect(
    () => () => {
      isLayoutReady.current = false;
      if (rootTransform && rootTransform !== 'none') {
        getOverlayHostController().restore(true);
      }
    },
    [rootTransform]
  );

  useEffect(() => {
    if (!autoKeyboardInsets || side !== 'bottom') {
      keyboardPadding.value = withTiming(0, { duration: 150 });
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const duration = Platform.OS === 'ios' ? OVERLAY_ANIMATION_DURATION : 150;

    const onShow = (e: { endCoordinates: { height: number } }) => {
      keyboardPaddingRef.current.value = withTiming(e.endCoordinates.height, {
        duration,
      });
    };
    const onHide = () => {
      keyboardPaddingRef.current.value = withTiming(0, { duration });
    };

    const subShow = Keyboard.addListener(showEvent, onShow);
    const subHide = Keyboard.addListener(hideEvent, onHide);

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [autoKeyboardInsets, side]);

  useEffect(() => {
    const padding = keyboardPaddingRef.current;

    return () => {
      Keyboard.dismiss();
      padding.value = 0;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    appear,
    disappear,
    close: (anim?: boolean) => {
      disappear(anim);
      return true;
    },
  }));

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      if (width === 0 || height === 0) return;

      if (!isLayoutReady.current) {
        initialLayout.current = { width, height };
        isLayoutReady.current = true;
        marginValue.value = getMarginSize();
        requestAnimationFrame(() => {
          contentOpacity.value = 1;
          appear();
        });
      }
    },
    [getMarginSize, appear]
  );

  const positionStyle = getPositionStyle(side);

  return (
    <OverlayBase
      style={style}
      ref={overlayRef}
      {...others}
      autoKeyboardInsets={false}
      onAppearCompleted={props.onAppearCompleted}
      onDisappearCompleted={() => {
        isLayoutReady.current = false;
        props.onDisappearCompleted?.();
      }}
      onCloseRequest={overlay => {
        if (props.onCloseRequest) {
          props.onCloseRequest(overlay);
        } else if (!props.modal) {
          disappear();
        }
      }}
    >
      <Animated.View
        style={[positionStyle, ui.overlay.sheetContainerStyle, containerStyle, animatedStyle]}
        onLayout={onLayout}
      >
        {autoKeyboardInsets && side === 'bottom' ? (
          <Animated.View style={keyboardAnimatedStyle}>{children}</Animated.View>
        ) : (
          children
        )}
      </Animated.View>
    </OverlayBase>
  );
});

function getPositionStyle(side: OverlaySide): ViewStyle {
  switch (side) {
    case 'top':
      return { left: 0, position: 'absolute', right: 0, top: 0 };
    case 'bottom':
      return { bottom: 0, left: 0, position: 'absolute', right: 0 };
    case 'left':
      return { bottom: 0, left: 0, position: 'absolute', top: 0 };
    case 'right':
      return { bottom: 0, position: 'absolute', right: 0, top: 0 };
  }
}

OverlaySheet.displayName = 'OverlaySheet';

export default OverlaySheet;
