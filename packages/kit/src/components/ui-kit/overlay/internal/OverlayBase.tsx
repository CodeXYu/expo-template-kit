/* eslint-disable react-hooks/exhaustive-deps -- Reanimated shared values are stable refs */
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  type NativeEventSubscription,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '../../../../hooks/use-theme';
import { useThemeUiTokens } from '../../../../providers/theme-provider';
import { OVERLAY_ANIMATION_DURATION, OVERLAY_EASING } from './constants';
import type { OverlayBaseProps, OverlayInstanceRef } from '../types';

const ANIMATION_CONFIG = {
  duration: OVERLAY_ANIMATION_DURATION,
  easing: OVERLAY_EASING,
};

const OverlayBase = forwardRef<OverlayInstanceRef, OverlayBaseProps>((props, ref) => {
  const {
    style,
    modal = false,
    animated = false,
    overlayOpacity,
    maskColor,
    overlayPointerEvents = 'auto',
    autoKeyboardInsets = false,
    closeOnHardwareBackPress = true,
    isTopOverlay = true,
    onAppearCompleted,
    onDisappearCompleted,
    onCloseRequest,
    children,
  } = props;

  const theme = useTheme();
  const ui = useThemeUiTokens();
  const resolvedMaskColor = maskColor ?? theme.overlay;

  const opacityValue = useSharedValue(0);
  const [closed, setClosed] = useState(false);

  const getOverlayOpacity = useCallback(
    () => (overlayOpacity != null ? overlayOpacity : ui.overlay.backdropOpacity),
    [overlayOpacity, ui.overlay.backdropOpacity]
  );

  const rootAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacityValue.value,
  }));

  const appear = useCallback(
    (anim: boolean = animated) => {
      if (anim) {
        opacityValue.value = withTiming(1, ANIMATION_CONFIG);
      } else {
        opacityValue.value = 1;
      }
      if (onAppearCompleted) {
        if (anim) {
          setTimeout(onAppearCompleted, OVERLAY_ANIMATION_DURATION);
        } else {
          onAppearCompleted();
        }
      }
    },
    [animated, onAppearCompleted]
  );

  const disappear = useCallback(
    (anim: boolean = animated) => {
      if (anim) {
        opacityValue.value = withTiming(0, ANIMATION_CONFIG);
      } else {
        opacityValue.value = 0;
      }
      if (onDisappearCompleted) {
        if (anim) {
          setTimeout(onDisappearCompleted, OVERLAY_ANIMATION_DURATION);
        } else {
          onDisappearCompleted();
        }
      }
    },
    [animated, onDisappearCompleted]
  );

  const close = useCallback(
    (anim: boolean = animated) => {
      if (closed) return true;
      setClosed(true);
      disappear(anim);
      return true;
    },
    [closed, animated, disappear]
  );

  const closeRequest = useCallback(() => {
    if (!isTopOverlay) {
      return;
    }

    if (onCloseRequest) {
      onCloseRequest({ close });
    } else if (!modal) {
      close();
    }
  }, [isTopOverlay, onCloseRequest, modal, close]);

  useImperativeHandle(ref, () => ({ close, appear, disappear }), [close, appear, disappear]);

  useEffect(() => {
    appear();
    let backHandler: NativeEventSubscription | undefined;
    if (Platform.OS === 'android') {
      backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (isTopOverlay && closeOnHardwareBackPress) {
          closeRequest();
          return true;
        }
        return false;
      });
    }
    return () => {
      backHandler?.remove();
    };
  }, []);

  const content = (
    <>
      <View
        pointerEvents={modal ? 'auto' : 'none'}
        style={[styles.backdrop, { backgroundColor: resolvedMaskColor, opacity: getOverlayOpacity() }]}
      />
      {children}
    </>
  );

  return (
    <Animated.View
      style={[styles.root, style, rootAnimatedStyle]}
      pointerEvents={closed ? 'none' : modal ? 'auto' : overlayPointerEvents}
      onTouchEnd={e => {
        if (isTopOverlay && e.currentTarget === e.target) {
          closeRequest();
        }
      }}
    >
      {autoKeyboardInsets ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  flex: { flex: 1 },
  root: {
    backgroundColor: 'transparent',
    flex: 1,
  },
});

OverlayBase.displayName = 'OverlayBase';

export default OverlayBase;
