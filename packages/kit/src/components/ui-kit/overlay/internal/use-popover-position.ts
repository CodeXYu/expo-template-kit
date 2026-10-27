import { Dimensions } from 'react-native';

import type { PopoverAlign, PopoverArrow, PopoverDirection } from '../types';

/**
 * Popover 内部定位 helper。
 *
 * 该 hook 只服务 Overlay 内部实现。业务代码应从 `expo-template-kit` 使用
 * `showOverlayPopover`，不要直接导入本文件。
 *
 * 坐标契约：
 * - `fromBounds` 必须已经是 Overlay 容器本地坐标，不是 window 坐标。
 * - 公共 API `showOverlayPopover({ fromBounds })` 仍接收 window 坐标。
 *   `OverlayPopover` 会测量自身容器，并在调用本 hook 前完成本地坐标转换。
 * - `viewportWidth` / `viewportHeight` 表示 Overlay 本地容器尺寸，用于
 *   自动翻转和边缘 clamp。`screenWidth` / `screenHeight` 仅作为旧内部调用的兼容兜底。
 * - `viewportInsets` 是本地 viewport 内的 safe-area 边缘保护，只参与最小边距约束，
 *   不用于修正坐标系。
 *
 * 定位流程：
 * 1. 锚点 bounds 或 popover 布局尺寸缺失时先隐藏。
 * 2. 将兼容写法 `direction="down"` 归一化为 `bottom`。
 * 3. 当目标方向空间不足时，只在同轴方向上自动翻转。
 * 4. 根据 direction 和 align 计算 popover 左上角位置。
 * 5. 按 viewport 和 safe-area 边缘保护 clamp 到可见区域内。
 * 6. clamp 后继续调整 arrow 偏移，让箭头尽量指向锚点中心。
 *
 * 参数语义：
 * - `directionInsets` 控制锚点与 popover 的弹出方向间距。
 * - `alignInsets` 沿交叉轴微调 `start` / `end` 对齐。
 * - `autoDirection=false` 时，即使靠近边缘也保持调用方指定方向。
 * - `showArrow=false` 只隐藏箭头，不改变 popover 的定位策略。
 *
 * 返回值语义：
 * - `popoverStyle` 是传给 `PopoverSurface` 的本地绝对定位 `left/top`。
 * - `arrow` 决定 `PopoverSurface` 渲染哪一侧或哪一角的箭头。
 * - `realDirection` 是兼容归一化和自动翻转后的真实方向。
 * - `arrowStyle` 是让箭头继续指向锚点的 margin 偏移。
 */
export interface PopoverPositionOptions {
  fromBounds: { x: number; y: number; width: number; height: number } | null;
  popoverWidth: number;
  popoverHeight: number;
  direction?: PopoverDirection;
  align?: PopoverAlign;
  directionInsets?: number;
  alignInsets?: number;
  autoDirection?: boolean;
  viewportWidth?: number;
  viewportHeight?: number;
  screenWidth?: number;
  screenHeight?: number;
  showArrow?: boolean;
  viewportInsets?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

export interface PopoverPositionResult {
  popoverStyle: {
    position: 'absolute';
    left: number;
    top: number;
    opacity?: number;
  };
  arrow: PopoverArrow;
  realDirection: PopoverDirection;
  arrowStyle?: Record<string, number>;
}

const EDGE_PADDING = 10;
const DEFAULT_ARROW_CORNER_PADDING = 12;
const ARROW_SIZE = 7;
const HALF_ARROW_DIAGONAL = Math.ceil(Math.sqrt(ARROW_SIZE * ARROW_SIZE * 2) / 2 / 0.5) * 0.5;
const ARROW_CENTER_OFFSET = DEFAULT_ARROW_CORNER_PADDING + ARROW_SIZE / 2;

export function usePopoverPosition(options: PopoverPositionOptions): PopoverPositionResult {
  const {
    fromBounds,
    popoverWidth,
    popoverHeight,
    direction = 'bottom',
    align = 'center',
    directionInsets = 0,
    alignInsets = 0,
    autoDirection = true,
    viewportWidth,
    viewportHeight,
    screenWidth,
    screenHeight,
    showArrow = true,
    viewportInsets,
  } = options;
  const boundsWidth = viewportWidth ?? screenWidth ?? Dimensions.get('window').width;
  const boundsHeight = viewportHeight ?? screenHeight ?? Dimensions.get('window').height;
  // "down" 是旧 API 兼容写法，定位计算内部统一当作 bottom。
  const normalizedDirection = direction === 'down' ? 'bottom' : direction;

  if (!fromBounds || !popoverWidth || !popoverHeight) {
    return {
      arrow: 'none',
      popoverStyle: { left: 0, opacity: 0, position: 'absolute', top: 0 },
      realDirection: normalizedDirection,
    };
  }

  const { x, y, width, height } = fromBounds;
  const anchorCenterX = x + width / 2;
  const anchorCenterY = y + height / 2;

  let dir = normalizedDirection;
  const ph = popoverHeight + directionInsets;
  const pw = popoverWidth + directionInsets;

  if (autoDirection) {
    // 只做同轴翻转，避免菜单在空间不足时跳到调用方完全没预期的方向。
    switch (dir) {
      case 'right':
        if (x + width + pw > boundsWidth && x >= pw) dir = 'left';
        break;
      case 'left':
        if (x - pw < 0 && x + width + pw <= boundsWidth) dir = 'right';
        break;
      case 'top':
        if (y - ph < 0 && y + height + ph <= boundsHeight) dir = 'bottom';
        break;
      case 'bottom':
        if (y + height + ph > boundsHeight && y >= ph) dir = 'top';
        break;
    }
  }

  const horizontalArrowInset =
    showArrow && (dir === 'left' || dir === 'right') ? HALF_ARROW_DIAGONAL : 0;
  const verticalArrowInset =
    showArrow && (dir === 'top' || dir === 'bottom') ? HALF_ARROW_DIAGONAL : 0;
  const contentWidth = Math.max(0, popoverWidth - horizontalArrowInset);
  const contentHeight = Math.max(0, popoverHeight - verticalArrowInset);

  let px = 0;
  let py = 0;
  let arrowDir: string = 'top';

  switch (dir) {
    case 'right':
      px = x + width + directionInsets;
      arrowDir = 'left';
      break;
    case 'left':
      px = x - popoverWidth - directionInsets;
      arrowDir = 'right';
      break;
    case 'top':
      py = y - popoverHeight - directionInsets;
      arrowDir = 'bottom';
      break;
    case 'bottom':
    default:
      py = y + height + directionInsets;
      arrowDir = 'top';
      break;
  }

  if (dir === 'bottom' || dir === 'top') {
    switch (align) {
      case 'start':
        px = x - alignInsets;
        arrowDir += 'Left';
        break;
      case 'center':
        px = anchorCenterX - contentWidth / 2;
        break;
      case 'end':
        px = x + width - contentWidth + alignInsets;
        arrowDir += 'Right';
        break;
    }
  } else {
    switch (align) {
      case 'start':
        py = y - alignInsets;
        arrowDir += 'Top';
        break;
      case 'center':
        py = anchorCenterY - contentHeight / 2;
        break;
      case 'end':
        py = y + height - contentHeight + alignInsets;
        arrowDir += 'Bottom';
        break;
    }
  }

  const minX = EDGE_PADDING + (viewportInsets?.left ?? 0);
  const maxX = boundsWidth - popoverWidth - EDGE_PADDING - (viewportInsets?.right ?? 0);
  const minY = EDGE_PADDING + (viewportInsets?.top ?? 0);
  const maxY = boundsHeight - popoverHeight - EDGE_PADDING - (viewportInsets?.bottom ?? 0);

  const clampedPx = Math.max(minX, Math.min(maxX, px));
  const clampedPy = Math.max(minY, Math.min(maxY, py));

  const arrowStyle: Record<string, number> = {};

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

  const getArrowOffset = (
    target: number,
    popoverStart: number,
    popoverSize: number,
    a: PopoverAlign
  ) => {
    // 弹层被屏幕边缘 clamp 后，箭头仍尽量指向锚点中心。
    const targetInPopover = clamp(
      target - popoverStart,
      ARROW_CENTER_OFFSET,
      popoverSize - ARROW_CENTER_OFFSET
    );

    switch (a) {
      case 'start':
        return {
          marginProp: 'start' as const,
          value: Math.max(0, targetInPopover - ARROW_CENTER_OFFSET),
        };
      case 'end':
        return {
          marginProp: 'end' as const,
          value: Math.max(0, popoverSize - ARROW_CENTER_OFFSET - targetInPopover),
        };
      case 'center':
      default:
        return {
          marginProp: 'center' as const,
          value: targetInPopover - popoverSize / 2,
        };
    }
  };

  if (dir === 'left' || dir === 'right') {
    const offset = getArrowOffset(anchorCenterY, clampedPy, popoverHeight, align);

    if (offset.marginProp === 'end') {
      arrowStyle.marginBottom = offset.value;
    } else {
      arrowStyle.marginTop = offset.value;
    }
  } else {
    const offset = getArrowOffset(anchorCenterX, clampedPx, popoverWidth, align);

    if (offset.marginProp === 'end') {
      arrowStyle.marginRight = offset.value;
    } else {
      arrowStyle.marginLeft = offset.value;
    }
  }

  return {
    arrow: showArrow ? (arrowDir as PopoverArrow) : 'none',
    arrowStyle,
    popoverStyle: { left: clampedPx, position: 'absolute', top: clampedPy },
    realDirection: dir,
  };
}
