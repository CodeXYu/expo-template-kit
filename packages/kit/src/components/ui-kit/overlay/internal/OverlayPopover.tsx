import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Dimensions, View, type LayoutChangeEvent, type ScaledSize } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import OverlayBase from './OverlayBase';
import PopoverSurface from './PopoverSurface';
import { usePopoverPosition } from './use-popover-position';
import type { OverlayInstanceRef, OverlayPopoverInternalProps } from '../types';

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const OverlayPopover = forwardRef<
  OverlayInstanceRef & {
    updateFromBounds: (b: { x: number; y: number; width?: number; height?: number }) => void;
  },
  OverlayPopoverInternalProps
>((props, ref) => {
  const {
    popoverStyle,
    fromBounds: initialFromBounds,
    direction = 'bottom',
    autoDirection = true,
    directionInsets = 0,
    align = 'end',
    alignInsets = 0,
    showArrow = true,
    paddingCorner,
    overlayOpacity = 0,
    children,
    ...others
  } = props;

  const overlayRef = useRef<OverlayInstanceRef>(null);
  // RN 0.88 exposes View as a function component; ComponentRef resolves the
  // host instance on both the old class-based and new function-based types.
  const containerRef = useRef<React.ComponentRef<typeof View>>(null);
  const [fromBounds, setFromBounds] = useState(initialFromBounds);
  const [popoverWidth, setPopoverWidth] = useState(0);
  const [popoverHeight, setPopoverHeight] = useState(0);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [containerBounds, setContainerBounds] = useState<Bounds | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    setFromBounds(initialFromBounds);
  }, [initialFromBounds]);

  const measureContainer = useCallback(() => {
    containerRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
      if (width === 0 || height === 0) return;
      setContainerBounds(current => {
        if (
          current &&
          current.x === x &&
          current.y === y &&
          current.width === width &&
          current.height === height
        ) {
          return current;
        }

        return { height, width, x, y };
      });
    });
  }, []);

  useEffect(() => {
    if (!initialFromBounds && props.fromView?.measureInWindow) {
      props.fromView.measureInWindow((x: number, y: number, width: number, height: number) => {
        setFromBounds({ height, width, x, y });
      });
    }
  }, [initialFromBounds, props.fromView]);

  useEffect(() => {
    const onChange = ({ window }: { window: ScaledSize }) => {
      setDimensions(window);
      requestAnimationFrame(measureContainer);
    };
    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription.remove();
  }, [measureContainer]);

  const updateFromBounds = useCallback(
    (bounds: { x: number; y: number; width?: number; height?: number }) => {
      setFromBounds(bounds);
    },
    []
  );

  const appear = useCallback(() => overlayRef.current?.appear(), []);
  const disappear = useCallback(() => overlayRef.current?.disappear(), []);
  const close = useCallback(() => overlayRef.current?.close() ?? false, []);

  useImperativeHandle(ref, () => ({ appear, disappear, close, updateFromBounds }));

  const onPopoverLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      if (width === 0 || height === 0) return;
      if (width !== popoverWidth || height !== popoverHeight) {
        setPopoverWidth(width);
        setPopoverHeight(height);
      }
    },
    [popoverWidth, popoverHeight]
  );

  const localFromBounds = useMemo(() => {
    if (!fromBounds || !containerBounds) return null;

    return {
      height: fromBounds.height || 0,
      width: fromBounds.width || 0,
      x: fromBounds.x - containerBounds.x,
      y: fromBounds.y - containerBounds.y,
    };
  }, [containerBounds, fromBounds]);

  const {
    popoverStyle: positionStyle,
    arrow,
    arrowStyle: calculatedArrowStyle,
  } = usePopoverPosition({
    align,
    alignInsets,
    autoDirection,
    direction,
    directionInsets,
    fromBounds: localFromBounds,
    popoverHeight,
    popoverWidth,
    viewportHeight: containerBounds?.height ?? dimensions.height,
    viewportInsets: insets,
    viewportWidth: containerBounds?.width ?? dimensions.width,
    showArrow,
  });

  return (
    <OverlayBase ref={overlayRef} overlayOpacity={overlayOpacity} {...others}>
      <View
        ref={containerRef}
        collapsable={false}
        onLayout={measureContainer}
        pointerEvents="box-none"
        style={{ flex: 1 }}
      >
        <PopoverSurface
          arrow={arrow}
          arrowStyle={calculatedArrowStyle}
          onLayout={onPopoverLayout}
          paddingCorner={paddingCorner}
          style={[popoverStyle, positionStyle]}
        >
          {children}
        </PopoverSurface>
      </View>
    </OverlayBase>
  );
});

OverlayPopover.displayName = 'OverlayPopover';

export default OverlayPopover;
