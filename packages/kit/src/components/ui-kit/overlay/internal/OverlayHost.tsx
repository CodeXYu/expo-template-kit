/* eslint-disable react-hooks/exhaustive-deps -- Reanimated shared values are stable refs */
import React, { useEffect, useReducer } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { OVERLAY_ANIMATION_DURATION, OVERLAY_EASING } from './constants';
import { registerOverlayHost, unregisterOverlayHost } from './host-controller';
import type { OverlayRootTransform, OverlayTransformItem } from '../types';

interface OverlayHostElement {
  key: number;
  element: React.ReactNode;
}

type Action =
  | { type: 'ADD'; payload: OverlayHostElement }
  | { type: 'UPDATE'; payload: OverlayHostElement }
  | { type: 'REMOVE'; payload: { key: number } }
  | { type: 'REMOVE_ALL' };

const elementsReducer = (state: OverlayHostElement[], action: Action): OverlayHostElement[] => {
  switch (action.type) {
    case 'ADD':
      return [...state, action.payload];
    case 'UPDATE':
      return state.map(item =>
        item.key === action.payload.key ? { ...item, element: action.payload.element } : item
      );
    case 'REMOVE':
      return state.filter(item => item.key !== action.payload.key);
    case 'REMOVE_ALL':
      return [];
    default:
      return state;
  }
};

const ANIMATION_CONFIG = {
  duration: OVERLAY_ANIMATION_DURATION,
  easing: OVERLAY_EASING,
};

interface OverlayHostProps {
  children?: React.ReactNode;
}

const OverlayHost: React.FC<OverlayHostProps> = props => {
  const [elements, dispatch] = useReducer(elementsReducer, []);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scaleX: scaleX.value },
      { scaleY: scaleY.value },
    ],
  }));

  useEffect(() => {
    // Host 是 overlay runtime 的唯一渲染入口；runtime 通过 controller
    // 增删实例，Sheet 也通过同一个 controller 驱动根内容 transform。
    const controller = {
      add: (key: number, element: React.ReactNode) => {
        dispatch({ type: 'ADD', payload: { key, element } });
      },

      update: (key: number, element: React.ReactNode) => {
        dispatch({ type: 'UPDATE', payload: { key, element } });
      },

      remove: (key: number) => {
        dispatch({ type: 'REMOVE', payload: { key } });
      },

      removeAll: () => {
        dispatch({ type: 'REMOVE_ALL' });
      },

      transform: (transform: OverlayRootTransform, animated: boolean) => {
        // 多个 transform item 按后写覆盖同类属性，便于调用方组合局部变换。
        const items: OverlayTransformItem[] = typeof transform === 'string' ? [] : transform;
        let tx = 0;
        let ty = 0;
        let sx = 1;
        let sy = 1;

        items.forEach(item => {
          if (item.translateX != null) tx = item.translateX;
          if (item.translateY != null) ty = item.translateY;
          if (item.scaleX != null) sx = item.scaleX;
          if (item.scaleY != null) sy = item.scaleY;
        });

        if (animated) {
          translateX.value = withTiming(tx, ANIMATION_CONFIG);
          translateY.value = withTiming(ty, ANIMATION_CONFIG);
          scaleX.value = withTiming(sx, ANIMATION_CONFIG);
          scaleY.value = withTiming(sy, ANIMATION_CONFIG);
        } else {
          translateX.value = tx;
          translateY.value = ty;
          scaleX.value = sx;
          scaleY.value = sy;
        }
      },

      restore: (animated: boolean) => {
        if (animated) {
          translateX.value = withTiming(0, ANIMATION_CONFIG);
          translateY.value = withTiming(0, ANIMATION_CONFIG);
          scaleX.value = withTiming(1, ANIMATION_CONFIG);
          scaleY.value = withTiming(1, ANIMATION_CONFIG);
        } else {
          translateX.value = 0;
          translateY.value = 0;
          scaleX.value = 1;
          scaleY.value = 1;
        }
      },
    };

    registerOverlayHost(controller);

    return () => {
      unregisterOverlayHost(controller);
    };
  }, []);

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.root, animatedStyle]}>{props.children}</Animated.View>
      {elements.map(item => (
        <OverlayWrapper
          key={`overlayHost${item.key}`}
          element={item.element}
          isTopOverlay={item.key === elements[elements.length - 1]?.key}
        />
      ))}
    </View>
  );
};

const OverlayWrapper = React.memo(
  ({ element, isTopOverlay }: { element: React.ReactNode; isTopOverlay: boolean }) => (
    <View style={styles.overlay} pointerEvents="box-none">
      {injectTopOverlayFlag(element, isTopOverlay)}
    </View>
  )
);
OverlayWrapper.displayName = 'OverlayWrapper';

function injectTopOverlayFlag(element: React.ReactNode, isTopOverlay: boolean) {
  if (!React.isValidElement(element)) {
    return element;
  }

  return React.cloneElement(element as React.ReactElement<{ isTopOverlay?: boolean }>, {
    isTopOverlay,
  });
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  overlay: {
    backgroundColor: 'transparent',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});

OverlayHost.displayName = 'OverlayHost';

export default OverlayHost;
