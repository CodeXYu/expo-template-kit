import { useWindowDimensions } from 'react-native';
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';

const BASE_LAYOUT_WIDTH = 375;

export type DeviceMetrics = {
  /** Current React Native window metrics, updated when the available window changes. */
  window: ReturnType<typeof useWindowDimensions>;
  /** Safe-area insets supplied by the nearest SafeAreaProvider. */
  safeAreaInsets: ReturnType<typeof useSafeAreaInsets>;
  /** Available frame inside the safe area. */
  safeAreaFrame: ReturnType<typeof useSafeAreaFrame>;
  /** Current available window width, in logical pixels. */
  screenWidth: number;
  /** Current available window height, in logical pixels. */
  screenHeight: number;
  /** Logical-pixel to physical-pixel scale for the current window. */
  pixelRatio: number;
  /** User-selected system text scaling factor. */
  fontScale: number;
  /** Smallest visible line width for the current pixel ratio. */
  hairlineWidth: number;
  /** Safe-area inset at the top edge. */
  safeTop: number;
  /** Safe-area inset at the bottom edge. */
  safeBottom: number;
  /** Safe-area inset at the left edge. */
  safeLeft: number;
  /** Safe-area inset at the right edge. */
  safeRight: number;
  /** Width available inside the safe area. */
  contentWidth: number;
  /** Height available inside the safe area. */
  contentHeight: number;
  /** Layout multiplier based on the shortest window edge, constrained to 0.8-1.2. */
  layoutScale: number;
  /** Whether the current window is portrait or square. */
  isPortrait: boolean;
  /** Whether the current window is wider than it is tall. */
  isLandscape: boolean;
};

/**
 * Provides responsive window and safe-area metrics for component layout.
 *
 * React Native updates this hook after rotation, split-screen, multi-window,
 * foldable-window, and system font-scale changes. Render it below SafeAreaProvider;
 * use safe-area values instead of guessing device-specific system-bar heights.
 */
export function useDeviceMetrics(): DeviceMetrics {
  const window = useWindowDimensions();
  const safeAreaInsets = useSafeAreaInsets();
  const safeAreaFrame = useSafeAreaFrame();
  const layoutScale = Math.min(window.width, window.height) / BASE_LAYOUT_WIDTH;

  return {
    window,
    safeAreaInsets,
    safeAreaFrame,
    screenWidth: window.width,
    screenHeight: window.height,
    pixelRatio: window.scale,
    fontScale: window.fontScale,
    hairlineWidth: 1 / window.scale,
    safeTop: safeAreaInsets.top,
    safeBottom: safeAreaInsets.bottom,
    safeLeft: safeAreaInsets.left,
    safeRight: safeAreaInsets.right,
    contentWidth: safeAreaFrame.width,
    contentHeight: safeAreaFrame.height,
    layoutScale: Math.min(Math.max(layoutScale, 0.8), 1.2),
    isPortrait: window.height >= window.width,
    isLandscape: window.width > window.height,
  };
}
