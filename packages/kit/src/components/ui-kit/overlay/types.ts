import type React from 'react';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';

export interface OverlayHandle<TUpdateOptions = OverlayUpdateOptions> {
  id: number;
  close: () => void;
  update: (nextOptions: TUpdateOptions) => void;
}

export type OverlayContent = React.ReactNode | ((handle: OverlayHandle) => React.ReactNode);

export type OverlaySide = 'top' | 'bottom' | 'left' | 'right';

export type PopoverDirection = 'top' | 'bottom' | 'left' | 'right' | 'down';

export type PopoverAlign = 'start' | 'center' | 'end';

export interface OverlayTransformItem {
  translateX?: number;
  translateY?: number;
  scaleX?: number;
  scaleY?: number;
}

export type OverlayRootTransform = 'none' | 'translate' | 'scale' | OverlayTransformItem[];

export interface OverlayCommandBaseOptions {
  content: OverlayContent;
  modal?: boolean;
  animated?: boolean;
  maskColor?: ColorValue;
  overlayOpacity?: number;
  overlayPointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto';
  closeOnHardwareBackPress?: boolean;
  overlayKey?: string;
  style?: StyleProp<ViewStyle>;
  onClose?: () => void;
  onCloseRequest?: (handle: OverlayHandle) => void;
  onDisappearCompleted?: () => void;
}

export interface OverlayModalOptions extends OverlayCommandBaseOptions {
  type?: 'zoomOut' | 'zoomIn' | 'custom';
  containerStyle?: StyleProp<ViewStyle>;
  customBounds?: { x: number; y: number; width: number; height: number };
  autoKeyboardInsets?: boolean;
}

export interface OverlaySheetOptions extends OverlayCommandBaseOptions {
  side?: OverlaySide;
  rootTransform?: OverlayRootTransform;
  containerStyle?: StyleProp<ViewStyle>;
  autoKeyboardInsets?: boolean;
}

export interface OverlayPopoverOptions extends OverlayCommandBaseOptions {
  popoverStyle?: StyleProp<ViewStyle>;
  fromBounds?: { x: number; y: number; width?: number; height?: number };
  fromView?: { measureInWindow: (callback: MeasureInWindowCallback) => void } | null;
  direction?: PopoverDirection;
  autoDirection?: boolean;
  directionInsets?: number;
  align?: PopoverAlign;
  alignInsets?: number;
  showArrow?: boolean;
  paddingCorner?: number;
}

export type OverlayModalUpdateOptions = Partial<OverlayModalOptions>;
export type OverlaySheetUpdateOptions = Partial<OverlaySheetOptions>;
export type OverlayPopoverUpdateOptions = Partial<OverlayPopoverOptions>;
export type OverlayUpdateOptions =
  OverlayModalUpdateOptions | OverlaySheetUpdateOptions | OverlayPopoverUpdateOptions;

export type MeasureInWindowCallback = (x: number, y: number, width: number, height: number) => void;

export interface OverlayInstanceRef {
  close: (animated?: boolean) => boolean;
  appear: (animated?: boolean) => void;
  disappear: (animated?: boolean) => void;
}

export interface OverlayBaseProps {
  style?: StyleProp<ViewStyle>;
  modal?: boolean;
  animated?: boolean;
  overlayOpacity?: number;
  maskColor?: ColorValue;
  overlayPointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto';
  autoKeyboardInsets?: boolean;
  closeOnHardwareBackPress?: boolean;
  onAppearCompleted?: () => void;
  onDisappearCompleted?: () => void;
  onCloseRequest?: (overlayView: Pick<OverlayInstanceRef, 'close'>) => void;
  children?: React.ReactNode;
  overlayKey?: string;
  isTopOverlay?: boolean;
}

export interface OverlayModalInternalProps extends OverlayBaseProps {
  type?: 'zoomOut' | 'zoomIn' | 'custom';
  containerStyle?: StyleProp<ViewStyle>;
  customBounds?: { x: number; y: number; width: number; height: number };
}

export interface OverlaySheetInternalProps extends OverlayBaseProps {
  side?: OverlaySide;
  containerStyle?: StyleProp<ViewStyle>;
  rootTransform?: OverlayRootTransform;
}

export type PopoverArrow =
  | 'none'
  | 'topLeft'
  | 'top'
  | 'topRight'
  | 'rightTop'
  | 'right'
  | 'rightBottom'
  | 'bottomRight'
  | 'bottom'
  | 'bottomLeft'
  | 'leftBottom'
  | 'left'
  | 'leftTop';

export interface OverlayPopoverInternalProps extends OverlayBaseProps {
  popoverStyle?: StyleProp<ViewStyle>;
  fromBounds?: { x: number; y: number; width?: number; height?: number };
  fromView?: { measureInWindow: (callback: MeasureInWindowCallback) => void } | null;
  direction?: PopoverDirection;
  autoDirection?: boolean;
  directionInsets?: number;
  align?: PopoverAlign;
  alignInsets?: number;
  showArrow?: boolean;
  paddingCorner?: number;
}
